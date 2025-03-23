// This is a Server Component (no "use client" directive)
import { FeatureRequestList } from "@/components/feature-request-list"
import { FilterBar } from "@/components/filter-bar"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/options"
import { Sparkles, MegaphoneIcon } from "lucide-react"
// import { SessionStatusClient } from "@/components/session-status-client"

export default async function Home() {
  // Use getServerSession instead of JWT verification
  const session = await getServerSession(authOptions)
  const isAdmin = session?.user?.role === "admin"

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-3 text-center">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Feature Requests</h1>
        <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed">
          Vote on existing feature requests or submit your own ideas to help us improve our product.
        </p>
      </div>
      <FilterBar />
      <FeatureRequestList isAdmin={isAdmin} />
    </div>
  )
}

