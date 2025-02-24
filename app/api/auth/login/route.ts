import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { signJWT } from "@/lib/jwt"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    console.log("Login attempt for:", email)

    if (!email || !password) {
      console.log("Missing credentials")
      return new NextResponse("Missing email or password", { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
      },
    })

    if (!user || !user.password) {
      console.log("User not found or no password")
      return new NextResponse("Invalid credentials", { status: 401 })
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      console.log("Invalid password")
      return new NextResponse("Invalid credentials", { status: 401 })
    }

    console.log("Login successful for:", email)

    // Create JWT token
    const token = await signJWT({
      id: user.id,
      email: user.email,
      role: user.role || 'user',
    })

    // Set cookie with more explicit options
    cookies().set({
      name: "token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      // Set an explicit expiration date
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role || 'user',
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

