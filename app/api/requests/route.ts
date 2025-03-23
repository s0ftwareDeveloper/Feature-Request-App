import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/options"
import { subDays, subWeeks, subMonths } from 'date-fns'

const ITEMS_PER_PAGE = 10
const MAX_TITLE_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 500
const VALID_STATUSES = ['pending', 'planned', 'completed', 'rejected']
const VALID_DATE_FILTERS = ['day', 'week', 'month']

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const pageStr = url.searchParams.get("page")
    const limitStr = url.searchParams.get("limit")
    const status = url.searchParams.get("status")
    const date = url.searchParams.get("date")
    const search = url.searchParams.get("search")

    // Validate pagination parameters
    let page = pageStr ? parseInt(pageStr) : 1
    let limit = limitStr ? parseInt(limitStr) : ITEMS_PER_PAGE

    if (isNaN(page) || page < 1) page = 1
    if (isNaN(limit) || limit < 1) limit = ITEMS_PER_PAGE

    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status parameter" }, { status: 400 })
    }

    // Validate date filter if provided
    if (date && !VALID_DATE_FILTERS.includes(date)) {
      return NextResponse.json({ error: "Invalid date parameter" }, { status: 400 })
    }
    
    // Get session from NextAuth
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    
    // Build the base query
    const where: any = {
      ...(status ? { status } : {})
    }
    
    // Add search conditionally with error handling
    if (search) {
      try {
        // Use lowercase search for MySQL
        const searchLower = search.toLowerCase()
        where.OR = [
          { title: { contains: searchLower } },
          { description: { contains: searchLower } }
        ]
      } catch (error) {
        console.error("Error adding search query:", error)
        // Continue without search if there's an error
      }
    }

    // Add date filtering
    if (date) {
      let dateFilter: Date;
      const now = new Date();
      
      switch (date) {
        case 'day':
          dateFilter = subDays(now, 1);
          break;
        case 'week':
          dateFilter = subWeeks(now, 1);
          break;
        case 'month':
          dateFilter = subMonths(now, 1);
          break;
        default:
          dateFilter = new Date(0); // Beginning of time if somehow an invalid value gets through
      }
      
      where.createdAt = {
        gte: dateFilter
      };
    }
    
    // Get total count
    let total = 0;
    let totalPages = 0;
    let formattedRequests = [];
    
    try {
      total = await prisma.featureRequest.count({ where })
      totalPages = Math.ceil(total / limit)
      
      // Fetch feature requests with pagination
      const requests = await prisma.featureRequest.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: {
          upvotes: {
            _count: "desc",
          },
        },
        include: {
          _count: {
            select: { upvotes: true },
          },
          upvotes: userId
            ? {
                where: { userId },
              }
            : false,
        },
      })
      
      // Format the response with user-specific upvote status
      formattedRequests = requests.map((request: any) => ({
        ...request,
        upvotes: request._count.upvotes,
        hasUpvoted: userId ? (request.upvotes?.length ?? 0) > 0 : false,
        isOwner: userId ? request.userId === userId : false,
      }))
    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json({ 
        error: "Database error", 
        details: dbError instanceof Error ? dbError.message : "Unknown error" 
      }, { status: 500 })
    }
    
    return NextResponse.json({
      requests: formattedRequests,
      total,
      currentPage: page,
      totalPages,
      itemsPerPage: limit
    })
  } catch (error) {
    console.error("Error fetching feature requests:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Get session from NextAuth instead of token
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const json = await request.json()
    const { title, description } = json

    if (!title || !description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate field lengths
    if (title.length > MAX_TITLE_LENGTH) {
      return NextResponse.json({ error: "Title exceeds maximum length" }, { status: 400 })
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json({ error: "Description exceeds maximum length" }, { status: 400 })
    }

    const featureRequest = await prisma.featureRequest.create({
      data: {
        title,
        description,
        userId: session.user.id,
        status: 'pending'
      },
    })

    return NextResponse.json(featureRequest, { status: 201 })
  } catch (error) {
    console.error("Error creating feature request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

