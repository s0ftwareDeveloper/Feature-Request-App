"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import { useInView } from "react-intersection-observer"
import { useEffect } from "react"
import { FeatureRequestCard } from "./feature-request-card"
import { Skeleton } from "@/components/ui/skeleton"
import { useSearchParams } from "next/navigation"
import api from "@/lib/axios"

type FeatureRequest = {
  id: string
  title: string
  description: string
  status: string
  createdAt: string
  upvotes: number
  hasUpvoted: boolean
}

export function FeatureRequestList({ isAdmin }: { isAdmin?: boolean }) {
  const { ref, inView } = useInView()
  const searchParams = useSearchParams()
  const status = searchParams.get("status")
  const date = searchParams.get("date")

  const fetchRequests = async ({ pageParam = 0 }) => {
    const params = new URLSearchParams()
    if (status) params.set("status", status)
    if (date) params.set("date", date)
    params.set("page", pageParam.toString())

    const { data } = await api.get(`/requests?${params.toString()}`)
    return data
  }

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status: queryStatus,
  } = useInfiniteQuery({
    queryKey: ["requests", status, date],
    queryFn: fetchRequests,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextPage : undefined),
  })

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage()
    }
  }, [inView, fetchNextPage, hasNextPage])

  if (queryStatus === "pending") {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-[200px] w-full" />
        ))}
      </div>
    )
  }

  if (queryStatus === "error") {
    return <div>Error loading requests</div>
  }

  return (
    <div className="space-y-4">
      {data.pages.map((page) =>
        page.requests.map((request: FeatureRequest) => (
          <FeatureRequestCard key={request.id} request={request} isAdmin={isAdmin} />
        )),
      )}
      <div ref={ref} className="h-8">
        {isFetchingNextPage && (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-[200px] w-full" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

