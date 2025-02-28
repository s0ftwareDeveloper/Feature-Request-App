import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  // Paths that require authentication
  const authPaths = ["/api/requests/new", "/api/upvote", "/my-requests", "/new"]

  // Admin only paths
  const adminPaths = ["/api/requests/status"]

  const path = request.nextUrl.pathname

  // Check if path requires authentication
  const isAuthPath = authPaths.some((authPath) => path.startsWith(authPath))
  const isAdminPath = adminPaths.some((adminPath) => path.startsWith(adminPath))

  if (!isAuthPath && !isAdminPath) {
    return NextResponse.next()
  }

  try {
    // Use NextAuth's getToken to verify the session
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    })

    if (!token) {
      if (request.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      return NextResponse.redirect(new URL("/login", request.url))
    }

    // Check admin access
    if (isAdminPath && token.role !== "admin") {
      if (request.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }
      return NextResponse.redirect(new URL("/", request.url))
    }

    return NextResponse.next()
  } catch (error) {
    console.error("Middleware error:", error)
    // Handle token verification errors gracefully
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication error" }, { status: 401 })
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }
}

export const config = {
  matcher: [
    // Protected API routes
    "/api/requests/new",
    "/api/upvote/:path*",
    "/api/requests/:path*/status",
    // Protected pages
    "/my-requests",
    "/new"
  ]
}

