import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyJWT } from "@/lib/jwt"

export async function PATCH(
  request: Request, 
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin access
    const token = cookies().get("token")?.value
    const payload = token ? await verifyJWT(token) : null

    if (!payload || payload.role !== "admin") {
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

