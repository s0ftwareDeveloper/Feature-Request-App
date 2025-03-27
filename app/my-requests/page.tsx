import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { FeatureRequestCard } from "@/components/feature-request-card"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"

export default async function MyRequests() {
  // Get session from NextAuth instead of JWT
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  const userId = session.user.id
  const isAdmin = session.user.role === "admin"

  // Log Prisma client models for debugging
  console.log("DEBUG - Available Prisma models:", Object.keys(prisma));

  const requests = await prisma.featurerequest.findMany({
    where: {
      userId,
    },
    orderBy: {
      upvote: {
        _count: "desc"
      }
    },
    include: {
      _count: {
        select: { upvote: true },
      },
      upvote: {
        where: { userId },
      },
    },
  })

  const formattedRequests = requests.map((request) => ({
    ...request,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    upvotes: request._count.upvote,
    hasUpvoted: request.upvote.length > 0,
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

