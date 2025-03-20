import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyJWT } from "@/lib/jwt"

// Handle upvote creation
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = cookies().get("token")?.value
    let payload = null
    try {
      payload = token ? await verifyJWT(token) : null
    } catch (error) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const requestId = params.id
    
    // Check if the feature request exists
    const featureRequest = await prisma.featureRequest.findUnique({
      where: { id: requestId },
    })

    if (!featureRequest) {
      return NextResponse.json({ error: "Feature request not found" }, { status: 404 })
    }

    // Create upvote if it doesn't exist
    const upvote = await prisma.upvote.create({
      data: {
        userId: payload.id,
        requestId,
      },
    })

    return NextResponse.json(upvote)
  } catch (error: any) {
    // Handle unique constraint violation (user already upvoted)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "You have already upvoted this request" }, { status: 400 })
    }
    
    console.error("Upvote error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Handle upvote deletion
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = cookies().get("token")?.value
    let payload = null
    try {
      payload = token ? await verifyJWT(token) : null
    } catch (error) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const requestId = params.id

    // First check if the upvote exists
    const existingUpvote = await prisma.upvote.findUnique({
      where: {
        userId_requestId: {
          userId: payload.id,
          requestId,
        },
      },
    })

    // If upvote doesn't exist, return success anyway to keep client in sync
    if (!existingUpvote) {
      return NextResponse.json({ success: true, message: "Upvote already removed" })
    }

    // Delete the upvote
    await prisma.upvote.delete({
      where: {
        userId_requestId: {
          userId: payload.id,
          requestId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Remove upvote error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 