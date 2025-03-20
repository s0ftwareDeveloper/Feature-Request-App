import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/options"

const ITEMS_PER_PAGE = 10
const MAX_TITLE_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 500
const VALID_STATUSES = ['pending', 'planned', 'completed', 'rejected']

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const pageStr = url.searchParams.get("page")
    const limitStr = url.searchParams.get("limit")
    const status = url.searchParams.get("status")
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
    
    // Get session from NextAuth
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    
    // Build the query
    const where = {
      ...(status ? { status } : {}),
      ...(search ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      } : {})
    }
    
    // Get total count
    const total = await prisma.featureRequest.count({ where })
    const totalPages = Math.ceil(total / limit)
    
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
    const formattedRequests = requests.map(request => ({
      ...request,
      upvotes: request._count.upvotes,
      hasUpvoted: userId ? (request.upvotes?.length ?? 0) > 0 : false,
      isOwner: userId ? request.userId === userId : false,
    }))
    
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

