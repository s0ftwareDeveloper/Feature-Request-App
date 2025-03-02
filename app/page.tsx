// This is a Server Component (no "use client" directive)
import { FeatureRequestList } from "@/components/feature-request-list"
import { FilterBar } from "@/components/filter-bar"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
// import { SessionStatusClient } from "@/components/session-status-client"

export default async function Home() {
  // Use getServerSession instead of JWT verification
  const session = await getServerSession(authOptions)
  const isAdmin = session?.user?.role === "admin"

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Feature Requests</h1>
        <p className="text-muted-foreground">Browse and upvote feature requests from the community</p>
      </div>
      <FilterBar />
      <FeatureRequestList isAdmin={isAdmin} />
      {/* <SessionStatusClient /> */}
    </div>
  )
}

