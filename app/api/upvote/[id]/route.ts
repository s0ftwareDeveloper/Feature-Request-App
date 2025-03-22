import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"

// Handle upvote creation
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get session from NextAuth instead of JWT token
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
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
        userId,
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
    // Get session from NextAuth instead of JWT token
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const requestId = params.id

    // First check if the upvote exists
    const existingUpvote = await prisma.upvote.findUnique({
      where: {
        userId_requestId: {
          userId,
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
          userId,
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