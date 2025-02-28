import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hash } from "bcrypt"

export async function POST(request: Request) {
  try {
    // Create a test user
    const existingUser = await prisma.user.findUnique({
      where: { email: "test@example.com" }
    })
    
    if (!existingUser) {
      await prisma.user.create({
        data: {
          email: "test@example.com",
          password: await hash("password123", 10),
          role: "user"
        }
      })
    }
    
    return NextResponse.json({ 
      message: "Test user created (test@example.com / password123)" 
    })
  } catch (error) {
    console.error("Error creating test user:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
} 