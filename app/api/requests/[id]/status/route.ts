import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../auth/[...nextauth]/options"

export async function PATCH(
  request: Request, 
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { status } = body
    
    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }
    
    // Validate status
    const validStatuses = ['pending', 'planned', 'completed', 'rejected']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    
    try {
      // Update status in database
      const updatedRequest = await prisma.featureRequest.update({
        where: { id: params.id },
        data: { status }
      })
      return NextResponse.json(updatedRequest)
    } catch (error: any) {
      // Check for Prisma's not found error
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Feature request not found' }, { status: 404 })
      }
      throw error // Re-throw other errors to be caught by outer try-catch
    }
  } catch (error) {
    console.error('Error updating status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

