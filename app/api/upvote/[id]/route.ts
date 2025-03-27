import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"

// Handle upvote creation
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  const requestId = params.id
  console.log(`Upvote POST - User: ${userId}, Request: ${requestId}`)

  if (!userId) {
    console.warn("Upvote POST - Unauthorized access attempt.")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    console.log("DEBUG - Available Prisma models:", Object.keys(prisma));
    
    // 1. Check if the feature request exists
    console.log(`DEBUG - Checking if feature request ${requestId} exists`)
    
    const featureRequest = await prisma.featurerequest.findUnique({
      where: { id: requestId },
      select: { id: true } // Only select id for existence check
    })

    if (!featureRequest) {
      console.log(`Upvote POST - Feature request not found: ${requestId}`)
      return NextResponse.json({ error: "Feature request not found" }, { status: 404 })
    }

    // 2. Check if user has already upvoted this request
    console.log(`DEBUG - Checking if user ${userId} already upvoted request ${requestId}`)
    
    const existingUpvote = await prisma.upvote.findUnique({
      where: {
        userId_requestId: { userId, requestId },
      },
      select: { id: true } // Only select id for existence check
    })

    if (existingUpvote) {
      console.log(`Upvote POST - User ${userId} already upvoted request ${requestId}. No action needed.`)
      // Return success (200 OK) as the desired state (upvoted) is true.
      // Include a message for clarity client-side if needed.
      return NextResponse.json({
        message: "You have already upvoted this request",
        upvoteId: existingUpvote.id
      }, { status: 200 })
    }

    // 3. Create upvote if it doesn't exist
    console.log(`Upvote POST - Creating upvote for User ${userId} on Request ${requestId}`)
    const newUpvote = await prisma.upvote.create({
      data: { userId, requestId },
    })
    console.log(`Upvote POST - Successfully created upvote: ${newUpvote.id}`)

    // Return 201 Created status for new resource
    return NextResponse.json(newUpvote, { status: 201 })

  } catch (error: any) {
    // Log the full error for detailed debugging
    console.error(`Upvote POST - Error for User ${userId}, Request ${requestId}:`, error)
    
    // Enhanced error logging
    console.error("DETAILED ERROR INFO:", {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
      meta: error.meta, // Prisma might add metadata
      cause: error.cause
    })

    // Check if it's a unique constraint violation (should be less likely now)
    if (error.code === 'P2002') {
      console.warn(`Upvote POST - Caught P2002 despite check for User ${userId}, Request ${requestId}`)
      return NextResponse.json({
        error: "Conflict",
        message: "You seem to have already upvoted this request."
       }, { status: 409 }) // 409 Conflict
    }

    // Log detailed error information for other unexpected errors
    console.error("Upvote POST - Unhandled error details:", {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
      meta: error.meta // Prisma might add metadata
    })

    // General Internal Server Error
    return NextResponse.json({
      error: "Internal server error",
      message: error.message || "Failed to process upvote",
      code: error.code
    }, { status: 500 })
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
    
    console.log(`Upvote DELETE - User: ${userId}, Request: ${requestId}`)

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
  } catch (error: any) {
    console.error("Remove upvote error:", error)
    // Enhanced error logging
    console.error("DETAILED DELETE ERROR INFO:", {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
      meta: error.meta,
      cause: error.cause
    })
    
    return NextResponse.json({ 
      error: "Internal server error", 
      message: error.message,
      code: error.code
    }, { status: 500 })
  }
} 