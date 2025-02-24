import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { FeatureRequestCard } from "@/components/feature-request-card"
import { cookies } from "next/headers"
import { verifyJWT } from "@/lib/jwt"

export default async function MyRequests() {
  const token = cookies().get("token")?.value
  const payload = token ? await verifyJWT(token) : null

  if (!payload) {
    redirect("/login")
  }

  const isAdmin = payload.role === "admin"

  const requests = await prisma.featureRequest.findMany({
    where: {
      userId: payload.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: { upvotes: true },
      },
      upvotes: {
        where: { userId: payload.id },
      },
    },
  })

  const formattedRequests = requests.map((request) => ({
    ...request,
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
            <FeatureRequestCard key={request.id} request={request} isAdmin={isAdmin} />
          ))}
        </div>
      )}
    </div>
  )
}

