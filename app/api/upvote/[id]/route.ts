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
    const payload = token ? await verifyJWT(token) : null

    if (!payload) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const requestId = params.id
    
    // Check if the feature request exists
    const featureRequest = await prisma.featureRequest.findUnique({
      where: { id: requestId },
    })

    if (!featureRequest) {
      return new NextResponse("Feature request not found", { status: 404 })
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
      return new NextResponse("You have already upvoted this request", { status: 400 })
    }
    
    console.error("Upvote error:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}

// Handle upvote deletion
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = cookies().get("token")?.value
    const payload = token ? await verifyJWT(token) : null

    if (!payload) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const requestId = params.id

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
    return new NextResponse("Internal server error", { status: 500 })
  }
} 