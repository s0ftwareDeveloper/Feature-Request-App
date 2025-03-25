import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { FeatureRequestCard } from "@/components/feature-request-card"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"
import { getToken } from "next-auth/jwt"
import { cookies, headers } from "next/headers"

export default async function MyRequests() {
  // Get session from NextAuth
  const session = await getServerSession(authOptions)
  
  // Get token directly as a fallback
  let userId = session?.user?.id
  let userRole = session?.user?.role || 'user'
  
  if (!userId) {
    // If session doesn't provide userId, try to get it from the token
    const headersList = headers()
    const cookieStore = cookies()
    
    const token = await getToken({
      req: { headers: headersList, cookies: cookieStore } as any,
      secret: process.env.NEXTAUTH_SECRET,
    })
    
    if (!token?.id) {
      redirect("/login")
    }
    
    userId = token.id as string
    userRole = (token.role as string) || 'user'
  }
  
  // Get feature requests
  const isAdmin = userRole === "admin"
  
  const requests = await prisma.featureRequest.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: { upvotes: true },
      },
      upvotes: {
        where: { userId },
      },
    },
  })

  const formattedRequests = requests.map((request) => ({
    ...request,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    upvotes: request._count.upvotes,
    hasUpvoted: request.upvotes.length > 0,
    isOwner: true,
  }))

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">My Requests</h1>
        <p className="text-muted-foreground">Manage your submitted feature requests</p>
      </div>
      {formattedRequests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">You haven't submitted any feature requests yet</div>
      ) : (
        <div className="space-y-4">
          {formattedRequests.map((request) => (
            <FeatureRequestCard 
              key={request.id} 
              request={request} 
              isAdmin={isAdmin} 
              showDeleteButton={true}
            />
          ))}
        </div>
      )}
    </div>
  )
}

