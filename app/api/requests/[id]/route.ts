import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyJWT } from "@/lib/jwt"

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
    
    // Fetch the feature request to check ownership
    const featureRequest = await prisma.featureRequest.findUnique({
      where: { id: requestId },
    })

    if (!featureRequest) {
      return new NextResponse("Feature request not found", { status: 404 })
    }

    // Check if user is owner or admin
    if (featureRequest.userId !== payload.id && payload.role !== "admin") {
      return new NextResponse("Unauthorized", { status: 403 })
    }

    // Delete related upvotes first (to maintain referential integrity)
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
    
    // Get user from JWT token
    const token = cookies().get("token")?.value
    const payload = token ? await verifyJWT(token) : null
    
    // Fetch the feature request with upvote count
    const featureRequest = await prisma.featureRequest.findUnique({
      where: { id: requestId },
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
    })

    if (!featureRequest) {
      return new NextResponse("Feature request not found", { status: 404 })
    }

    // Format the response with user-specific upvote status
    const formattedRequest = {
      ...featureRequest,
      upvotes: featureRequest._count.upvotes,
      hasUpvoted: payload ? featureRequest.upvotes.length > 0 : false,
      isOwner: payload ? featureRequest.userId === payload.id : false,
    }

    return NextResponse.json(formattedRequest)
  } catch (error) {
    console.error("Error fetching feature request:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
} 