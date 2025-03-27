import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { FeatureRequestCard } from "@/components/feature-request-card"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"
import { StatusFilter } from "@/components/status-filter"
import { TimeframeFilter } from "@/components/timeframe-filter"
import { subHours, subDays, subMonths } from "date-fns"

type SearchParams = {
  status?: string
  timeframe?: string
}

export default async function MyRequests({ searchParams }: { searchParams: SearchParams }) {
  // Get session from NextAuth instead of JWT
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  const userId = session.user.id
  const isAdmin = session.user.role === "admin"
  const statusFilter = searchParams?.status
  const timeframeFilter = searchParams?.timeframe

  // Validate status parameter if present
  const validStatuses = ['pending', 'planned', 'completed']
  if (statusFilter && !validStatuses.includes(statusFilter)) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">My Requests</h1>
          <p className="text-muted-foreground">Manage your submitted feature requests</p>
        </div>
        <div className="text-red-500">Invalid status parameter</div>
      </div>
    )
  }

  // Validate timeframe parameter if present
  const validTimeframes = ['24h', 'week', 'month']
  if (timeframeFilter && !validTimeframes.includes(timeframeFilter)) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">My Requests</h1>
          <p className="text-muted-foreground">Manage your submitted feature requests</p>
        </div>
        <div className="text-red-500">Invalid timeframe parameter</div>
      </div>
    )
  }

  // Calculate date filter for timeframe
  let dateFilter = null
  if (timeframeFilter === '24h') {
    dateFilter = subHours(new Date(), 24)
  } else if (timeframeFilter === 'week') {
    dateFilter = subDays(new Date(), 7)
  } else if (timeframeFilter === 'month') {
    dateFilter = subMonths(new Date(), 1)
  }

  // Build where clause
  const whereClause: any = { userId }
  
  if (statusFilter) {
    whereClause.status = statusFilter
  }
  
  if (dateFilter) {
    whereClause.createdAt = {
      gte: dateFilter
    }
  }

  // Log Prisma client models for debugging
  console.log("DEBUG - Available Prisma models:", Object.keys(prisma));

  const requests = await prisma.featurerequest.findMany({
    where: whereClause,
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

  // Helper function to generate empty state message
  const getEmptyStateMessage = () => {
    if (timeframeFilter) {
      const timeframeText = timeframeFilter === '24h' 
        ? 'in the past 24 hours' 
        : timeframeFilter === 'week' 
          ? 'in the past week' 
          : 'in the past month'
          
      return statusFilter 
        ? `You haven't submitted any ${statusFilter} feature requests ${timeframeText}` 
        : `You haven't submitted any feature requests ${timeframeText}`
    } else if (statusFilter) {
      return `You haven't submitted any ${statusFilter} feature requests yet`
    } else {
      return "You haven't submitted any feature requests yet"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">My Requests</h1>
          <p className="text-muted-foreground">Manage your submitted feature requests</p>
        </div>
        
        <div className="flex flex-col space-y-2">
          <StatusFilter activeStatus={statusFilter || null} />
          <TimeframeFilter activeTimeframe={timeframeFilter || null} />
        </div>
      </div>
      
      {formattedRequests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {getEmptyStateMessage()}
        </div>
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

