import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/options"

// Create a fresh Prisma client
const db = new PrismaClient()

export async function GET() {
  try {
    console.log("Starting GET /api/requests")
    
    // Get the current user's session
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    
    // Fetch all feature requests with upvote counts - sorted by upvote count in descending order
    const sql = `
      SELECT 
        f.*,
        COUNT(DISTINCT u.id) AS upvotes,
        ${userId ? `MAX(CASE WHEN u.userId = ? THEN 1 ELSE 0 END) AS hasUpvoted` : '0 AS hasUpvoted'}
      FROM featurerequest f
      LEFT JOIN upvote u ON f.id = u.requestId
      GROUP BY f.id, f.title, f.description, f.status, f.createdAt, f.updatedAt, f.userId
      ORDER BY COUNT(DISTINCT u.id) DESC, f.createdAt DESC
      LIMIT 50
    `
    
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
      totalPages: 1
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

