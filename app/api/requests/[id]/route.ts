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
    
    console.log("DEBUG - Available Prisma models:", Object.keys(prisma));
    
    // Fetch the feature request to check ownership
    const featureRequest = await prisma.featurerequest.findUnique({
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
    await prisma.featurerequest.delete({
      where: { id: requestId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting feature request:", error)
    console.error("DETAILED DELETE ERROR INFO:", {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
      meta: error.meta,
      cause: error.cause
    })
    return new NextResponse("Internal server error", { status: 500 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const requestId = params.id
    console.log(`GET /api/requests/${requestId}`)
    
    // Get user from NextAuth session
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    
    console.log("DEBUG - Available Prisma models:", Object.keys(prisma));
    console.log(`DEBUG - Attempting to fetch feature request ${requestId}`);
    
    // Fetch the feature request with upvote count and user's upvote status
    const featureRequest = await prisma.featurerequest.findUnique({
      where: { id: requestId },
      include: {
        _count: {
          select: { upvote: true }
        },
        upvote: userId ? {
          where: { userId },
        } : undefined,
      }
    })

    if (!featureRequest) {
      console.log(`Feature request not found: ${requestId}`)
      return NextResponse.json({ error: "Feature request not found" }, { status: 404 })
    }

    console.log(`DEBUG - Found feature request: ${JSON.stringify(featureRequest, null, 2)}`);

    // Safely handle upvotes data
    const hasUpvoted = userId ? 
      (featureRequest.upvote && Array.isArray(featureRequest.upvote) && featureRequest.upvote.length > 0) : 
      false
    
    // Format the response with user-specific upvote status
    const formattedRequest = {
      id: featureRequest.id,
      title: featureRequest.title,
      description: featureRequest.description,
      status: featureRequest.status,
      createdAt: featureRequest.createdAt,
      updatedAt: featureRequest.updatedAt,
      userId: featureRequest.userId,
      upvotes: featureRequest._count.upvote,
      hasUpvoted: hasUpvoted,
      isOwner: userId ? featureRequest.userId === userId : false
    }

    return NextResponse.json(formattedRequest)
  } catch (error: any) {
    console.error("Error fetching feature request:", error)
    console.error("DETAILED GET ERROR INFO:", {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
      meta: error.meta,
      cause: error.cause,
      params: params
    })
    return NextResponse.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 