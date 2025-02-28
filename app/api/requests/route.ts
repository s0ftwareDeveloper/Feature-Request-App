import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

const ITEMS_PER_PAGE = 10

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get("page") || "0")
    const status = url.searchParams.get("status") || undefined
    const search = url.searchParams.get("search") || undefined
    
    // Get session from NextAuth
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    
    // Build the query
    const where = {
      ...(status ? { status } : {}),
    }
    
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
    
    // Get the next cursor
    const nextCursor = requests.length === ITEMS_PER_PAGE ? (page + 1) * ITEMS_PER_PAGE : null
    
    return NextResponse.json({
      requests: formattedRequests,
      nextCursor,
    })
  } catch (error) {
    console.error("Error fetching feature requests:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}

export async function POST(request: Request) {
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

  const featureRequest = await prisma.featureRequest.create({
    data: {
      title,
      description,
      userId: session.user.id,
    },
  })

  return NextResponse.json(featureRequest)
}

