import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../auth/[...nextauth]/options"

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get session from NextAuth
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const requestId = params.id
    
    // Fetch the feature request to check ownership
    const featureRequest = await prisma.featureRequest.findUnique({
      where: { id: requestId },
    })

    if (!featureRequest) {
      return new NextResponse("Feature request not found", { status: 404 })
    }

    // Check if user is owner or admin
    if (featureRequest.userId !== session.user.id && session.user.role !== "admin") {
      return new NextResponse("Unauthorized", { status: 403 })
    }

    // Delete related upvotes first
    await prisma.upvote.deleteMany({
      where: { requestId },
    })

    // Delete the feature request
    await prisma.featureRequest.delete({
      where: { id: requestId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting feature request:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const requestId = params.id
    
    // Get user from NextAuth session
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    
    // Fetch the feature request with upvote count and user's upvote status
    const featureRequest = await prisma.featureRequest.findUnique({
      where: { id: requestId },
      include: {
        _count: {
          select: { upvotes: true }
        },
        upvotes: userId ? {
          where: { userId },
        } : false,
      }
    })

    if (!featureRequest) {
      return new NextResponse("Feature request not found", { status: 404 })
    }

    // Format the response with user-specific upvote status
    const formattedRequest = {
      ...featureRequest,
      upvotes: featureRequest._count.upvotes,
      hasUpvoted: userId ? (featureRequest.upvotes && 'length' in featureRequest.upvotes ? featureRequest.upvotes.length > 0 : false) : false,
      isOwner: userId ? featureRequest.userId === userId : false,
    }

    return NextResponse.json(formattedRequest)
  } catch (error) {
    console.error("Error fetching feature request:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
} 