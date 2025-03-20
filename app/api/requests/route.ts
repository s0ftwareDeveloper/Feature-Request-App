import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/options"

const ITEMS_PER_PAGE = 10
const MAX_TITLE_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 500

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get("page") || "1") - 1 // Convert to 0-based index
    const status = url.searchParams.get("status") || undefined
    const search = url.searchParams.get("search") || undefined
    
    // Get session from NextAuth
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    
    // Build the query
    const where = {
      ...(status ? { status } : {}),
    }
    
    // Get total count
    const total = await prisma.featureRequest.count({ where })
    
    // Fetch feature requests with pagination
    const requests = await prisma.featureRequest.findMany({
      where,
      take: ITEMS_PER_PAGE,
      skip: page * ITEMS_PER_PAGE,
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
      hasUpvoted: userId ? request.upvotes.length > 0 : false,
      isOwner: userId ? request.userId === userId : false,
    }))
    
    return NextResponse.json({
      requests: formattedRequests,
      total,
    })
  } catch (error) {
    console.error("Error fetching feature requests:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Get session from NextAuth instead of token
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const json = await request.json()
    const { title, description } = json

    if (!title || !description) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Validate field lengths
    if (title.length > MAX_TITLE_LENGTH) {
      return new NextResponse("Title exceeds maximum length", { status: 400 })
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return new NextResponse("Description exceeds maximum length", { status: 400 })
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
    return new NextResponse("Internal server error", { status: 500 })
  }
}

