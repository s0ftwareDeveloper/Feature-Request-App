import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { sub } from "date-fns"
import { cookies } from "next/headers"
import { verifyJWT } from "@/lib/jwt"

const ITEMS_PER_PAGE = 10

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = Number.parseInt(searchParams.get("page") || "0")
  const status = searchParams.get("status")
  const date = searchParams.get("date")
  
  // Get user from JWT token
  const token = cookies().get("token")?.value
  const payload = token ? verifyJWT(token) : null

  let dateFilter = {}
  if (date) {
    const now = new Date()
    switch (date) {
      case "day":
        dateFilter = { createdAt: { gte: sub(now, { days: 1 }) } }
        break
      case "week":
        dateFilter = { createdAt: { gte: sub(now, { weeks: 1 }) } }
        break
      case "month":
        dateFilter = { createdAt: { gte: sub(now, { months: 1 }) } }
        break
    }
  }

  const where = {
    ...(status && { status }),
    ...dateFilter,
  }

  const [requests, total] = await Promise.all([
    prisma.featureRequest.findMany({
      where,
      orderBy: [{ upvotes: { _count: "desc" } }, { createdAt: "desc" }],
      skip: page * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
      include: {
        _count: {
          select: { upvotes: true },
        },
        upvotes: payload
          ? {
              where: { userId: payload.id },
            }
          : false,
      },
    }),
    prisma.featureRequest.count({ where }),
  ])

  const formattedRequests = requests.map((request) => ({
    ...request,
    upvotes: request._count.upvotes,
    hasUpvoted: payload ? request.upvotes.length > 0 : false,
    isOwner: payload ? request.userId === payload.id : false,
  }))

  return NextResponse.json({
    requests: formattedRequests,
    hasMore: (page + 1) * ITEMS_PER_PAGE < total,
    nextPage: page + 1,
  })
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

