import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { sub } from "date-fns"
import { cookies } from "next/headers"
import { verifyJWT } from "@/lib/jwt"

const ITEMS_PER_PAGE = 10

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const cursor = searchParams.get("cursor")
    const limit = parseInt(searchParams.get("limit") || "10")
    
    // Get user from JWT token
    const token = cookies().get("token")?.value
    const payload = token ? await verifyJWT(token) : null
    const userId = payload?.id
    
    // Build the query
    const where = {
      ...(status ? { status } : {}),
    }
    
    // Fetch feature requests with pagination
    const requests = await prisma.featureRequest.findMany({
      where,
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
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
    const nextCursor = requests.length === limit ? requests[requests.length - 1].id : null
    
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
  const token = cookies().get("token")?.value
  const payload = token ? await verifyJWT(token) : null

  if (!payload) {
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
      userId: payload.id,
    },
  })

  return NextResponse.json(featureRequest)
}

