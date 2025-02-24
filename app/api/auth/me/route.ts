import { verifyJWT } from "@/lib/jwt"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const token = cookies().get("token")?.value

    if (!token) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const payload = await verifyJWT(token)
    if (!payload) {
      return new NextResponse("Invalid token", { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        role: true,
      },
    })

    if (!user) {
      return new NextResponse("User not found", { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Auth check error:", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

