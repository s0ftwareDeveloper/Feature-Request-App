import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyJWT } from "./lib/jwt"

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

  const token = request.cookies.get("token")?.value
  console.log("token", token)

  if (!token) {
    console.log("no token")
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const payload = await verifyJWT(token)
  console.log("payload", payload)
  if (!payload) {
    console.log("invalid token")
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Check admin access
  if (isAdminPath && payload.role !== "admin") {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
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

