import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Get error details from URL
  const { searchParams } = new URL(request.url)
  const error = searchParams.get('error')
  
  // Log error for debugging
  console.error('Authentication error:', error)
  
  // Return a JSON response with error details
  return NextResponse.json({ 
    error: error || 'Unknown auth error',
    message: 'Authentication failed'
  }, { status: 400 })
} 