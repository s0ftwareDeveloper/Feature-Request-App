import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function PATCH(
  request: Request, 
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin access using NextAuth
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== "admin") {
      return new NextResponse("Unauthorized", { status: 403 })
    }

    const requestId = params.id
    const { status } = await request.json()

    // Validate status
    const validStatuses = ["pending", "planned", "completed"]
    if (!validStatuses.includes(status)) {
      return new NextResponse("Invalid status", { status: 400 })
    }

    // Update the feature request status
    const updatedRequest = await prisma.featureRequest.update({
      where: { id: requestId },
      data: { status },
    })

    return NextResponse.json(updatedRequest)
  } catch (error) {
    console.error("Error updating status:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}

