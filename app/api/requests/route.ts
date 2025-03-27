import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/options"
import { subHours, subDays, subMonths, format } from 'date-fns'

// Create a fresh Prisma client
const db = new PrismaClient()

export async function GET(request: Request) {
  try {
    console.log("Starting GET /api/requests")
    
    // Get the URL to extract query parameters
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('search')
    const timeframe = url.searchParams.get('timeframe')
    
    // Validate status parameter
    const validStatuses = ['pending', 'planned', 'completed']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status parameter" }, { status: 400 })
    }

    // Validate timeframe parameter
    const validTimeframes = ['24h', 'week', 'month']
    if (timeframe && !validTimeframes.includes(timeframe)) {
      return NextResponse.json({ error: "Invalid timeframe parameter" }, { status: 400 })
    }
    
    // Get the current user's session
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    // Calculate date for timeframe filtering
    let dateFilter = null
    const now = new Date()
    
    if (timeframe === '24h') {
      dateFilter = subHours(now, 24)
    } else if (timeframe === 'week') {
      dateFilter = subDays(now, 7)
    } else if (timeframe === 'month') {
      dateFilter = subMonths(now, 1)
    }

    // Format date for SQL query if needed
    const formattedDate = dateFilter ? format(dateFilter, "yyyy-MM-dd HH:mm:ss") : null
    
    // Prepare SQL query with potential WHERE clauses
    let whereClause = []
    
    if (status) {
      whereClause.push(`f.status = '${status}'`)
    }
    
    if (formattedDate) {
      whereClause.push(`f.createdAt >= '${formattedDate}'`)
    }
    
    if (search) {
      whereClause.push(`(f.title LIKE '%${search}%' OR f.description LIKE '%${search}%')`)
    }
    
    const whereString = whereClause.length > 0 
      ? `WHERE ${whereClause.join(' AND ')}` 
      : ''
    
    // Fetch all feature requests with upvote counts - sorted by upvote count in descending order
    const sql = `
      SELECT 
        f.*,
        COUNT(DISTINCT u.id) AS upvotes,
        ${userId ? `MAX(CASE WHEN u.userId = ? THEN 1 ELSE 0 END) AS hasUpvoted` : '0 AS hasUpvoted'}
      FROM featurerequest f
      LEFT JOIN upvote u ON f.id = u.requestId
      ${whereString}
      GROUP BY f.id, f.title, f.description, f.status, f.createdAt, f.updatedAt, f.userId
      ORDER BY COUNT(DISTINCT u.id) DESC, f.createdAt DESC
      LIMIT 50
    `
    
    console.log("Executing SQL query:", sql)
    
    // Execute the raw query directly
    const results = userId
      ? await db.$queryRawUnsafe(sql, userId)
      : await db.$queryRawUnsafe(sql)
    
    console.log(`Got ${Array.isArray(results) ? results.length : 0} results`)
    
    // Format the results to ensure hasUpvoted is a boolean
    const formattedResults = Array.isArray(results) 
      ? results.map(request => ({
          ...request,
          upvotes: Number(request.upvotes || 0),
          hasUpvoted: Boolean(request.hasUpvoted),
          isOwner: userId ? request.userId === userId : false
        }))
      : []
    
    // Return the data directly
    return NextResponse.json({
      requests: formattedResults,
      total: formattedResults.length,
      hasMore: false,
      currentPage: 0,
      totalPages: 1,
      filterApplied: !!status || !!timeframe,
      activeTimeframe: timeframe || null
    })
  } catch (error) {
    console.error("ERROR in GET /api/requests:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// Keep the POST method simple for now
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    const { title, description } = await request.json();
    
    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    }
    
    // Create a new feature request using raw SQL
    await db.$executeRaw`
      INSERT INTO featurerequest (id, title, description, status, createdAt, updatedAt, userId)
      VALUES (UUID(), ${title}, ${description}, 'pending', NOW(), NOW(), ${session.user.id})
    `;
    
    return NextResponse.json({
      success: true,
      message: "Feature request created"
    }, { status: 201 });
    
  } catch (error) {
    console.error("Error in POST /api/requests:", error);
    
    return NextResponse.json({
      error: "Failed to create feature request",
      message: String(error),
      stack: (error as any).stack
    }, { status: 500 });
  }
}

