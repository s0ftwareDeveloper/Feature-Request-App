import { NextResponse } from 'next/server'

// This endpoint is used by NextAuth.js for logging errors
export async function POST(request: Request) {
  try {
    const { error } = await request.json()
    
    // In production, you might want to log to a monitoring service
    console.error('NextAuth client-side error:', error)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false })
  }
} 