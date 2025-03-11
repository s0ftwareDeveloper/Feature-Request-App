import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"

export async function PATCH(
  request: Request, 
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    const { status } = await request.json()
    
    // Validate status
    const validStatuses = ['pending', 'planned', 'completed', 'rejected']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    
    // Update status in database
    const updatedRequest = await prisma.featureRequest.update({
      where: { id: params.id },
      data: { status }
    })
    
    return NextResponse.json(updatedRequest)
  } catch (error) {
    console.error('Error updating status:', error)
    return NextResponse.json({ error: 'Error updating status' }, { status: 500 })
  }
}

