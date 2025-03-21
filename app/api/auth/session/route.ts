import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../[...nextauth]/options'

// This route supports the client-side session retrieval
export async function GET() {
  const session = await getServerSession(authOptions)
  
  return NextResponse.json(session || { user: null })
} 