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
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get("page") || "0")
    const status = searchParams.get("status")
    const take = 10
    const skip = page * take

    // Build where clause
    const where = status ? { status } : {}

    // Get requests with upvote count
    const requests = await prisma.featurerequest.findMany({
      where,
      orderBy: [
        { createdAt: 'desc' }
      ],
      include: {
        _count: {
          select: { upvote: true }
        }
      },
      take,
      skip,
    })

    // Get total count for pagination
    const total = await prisma.featurerequest.count({ where })

    // Even if no requests found, return empty array (not an error)
    return NextResponse.json({
      requests: requests.map(request => ({
        ...request,
        upvotes: request._count.upvote
      })),
      hasMore: (page + 1) * take < total,
      total
    })

  } catch (error) {
    console.error("Error fetching requests:", error)
    return NextResponse.json(
      { error: "Failed to fetch requests" },
      { status: 500 }
    )
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

