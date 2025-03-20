import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  try {
    // Clear the token cookie
    cookies().delete("token")
    
    return NextResponse.json({ message: "Logged out successfully" })
  } catch (error) {
    console.error("Error during logout:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
} 