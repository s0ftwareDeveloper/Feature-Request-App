import { FeatureRequestList } from "@/components/feature-request-list"
import { FilterBar } from "@/components/filter-bar"
import { cookies } from "next/headers"
import { verifyJWT } from "@/lib/jwt"

export default async function Home() {
  const token = cookies().get("token")?.value
  const payload = token ? verifyJWT(token) : null
  const isAdmin = payload?.role === "admin"

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Feature Requests</h1>
        <p className="text-muted-foreground">Browse and upvote feature requests from the community</p>
      </div>
      <FilterBar />
      <FeatureRequestList isAdmin={isAdmin} />
    </div>
  )
}

