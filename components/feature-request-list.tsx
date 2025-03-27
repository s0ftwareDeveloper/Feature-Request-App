"use client"

import { useEffect, useState } from "react"
import { FeatureRequestCard } from "@/components/feature-request-card"
import { useSearchParams } from "next/navigation"
import api from "@/lib/axios"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, SearchX } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { debounce } from "lodash"

type FeatureRequest = {
  id: string
  title: string
  description: string
  status: string
  createdAt: string
  upvotes: number
  hasUpvoted: boolean
  isOwner?: boolean
}

type FeatureRequestListProps = {
  isAdmin?: boolean
}

export function FeatureRequestList({ isAdmin = false }: FeatureRequestListProps) {
  const searchParams = useSearchParams()
  const [requests, setRequests] = useState<FeatureRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [pagination, setPagination] = useState({
    total: 0,
    currentPage: 1,
    totalPages: 1
  })

  const fetchRequests = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Fetching feature requests...')
      
      // Include filter params if any
      const filter = searchParams?.get('filter')
      const status = searchParams?.get('status')
      
      let url = '/requests'
      if (searchTerm || filter || status) {
        const params = new URLSearchParams()
        if (searchTerm) params.append('search', searchTerm)
        if (filter) params.append('filter', filter)
        if (status) params.append('status', status)
        url += `?${params.toString()}`
      }
      
      // Make request with query params
      const response = await api.get(url)
      console.log('API response:', response)
      
      // Check if we got valid data
      if (response?.data?.requests && Array.isArray(response.data.requests)) {
        // Ensure all requests have numeric upvote counts
        const formattedRequests = response.data.requests.map((req: any) => ({
          ...req,
          upvotes: Number(req.upvotes || 0),
          hasUpvoted: Boolean(req.hasUpvoted)
        }))
        
        setRequests(formattedRequests)
        console.log(`Loaded ${formattedRequests.length} requests`)
        
        // Update pagination if available
        setPagination({
          total: response.data.total || formattedRequests.length,
          currentPage: response.data.currentPage || 0,
          totalPages: response.data.totalPages || 1
        })
      } else {
        console.error('Invalid response format:', response?.data)
        setError('Received invalid data from server')
        setRequests([])
      }
    } catch (error: any) {
      console.error('Error fetching requests:', error)
      console.error('Response data:', error.response?.data)
      
      // Show a helpful error message
      setError(error.response?.data?.error || 'Could not load feature requests')
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  // Use useEffect without debounce for initial load and filter changes
  useEffect(() => {
    if (!searchTerm) {
      fetchRequests()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])
  
  // Separate useEffect for search with strong debounce
  useEffect(() => {
    if (!searchTerm) return;
    
    const handler = debounce(() => {
      fetchRequests()
    }, 500)
    
    handler()
    
    return () => {
      handler.cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    // Clear results immediately when search is cleared
    if (e.target.value === "") {
      fetchRequests()
    }
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Input
          type="search"
          placeholder="Search feature requests..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full md:max-w-md pl-4 pr-10 py-2 bg-background/80 focus-visible:ring-primary/40 focus-visible:ring-offset-0"
        />
        {searchTerm && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8"
            onClick={() => setSearchTerm("")}
          >
            <span className="sr-only">Clear search</span>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70">
              <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.8071 2.99385 3.44303 2.99385 3.21848 3.2184C2.99394 3.44295 2.99394 3.80702 3.21848 4.03157L6.6869 7.49999L3.21848 10.9684C2.99394 11.193 2.99394 11.557 3.21848 11.7816C3.44303 12.0061 3.8071 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
            </svg>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-lg border p-5">
              <div className="flex justify-between items-start">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-20 w-full" />
              <div className="flex justify-between pt-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-lg border border-muted/60 bg-card p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <SearchX className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No feature requests found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchTerm 
              ? `No results match your search "${searchTerm}". Try a different search term.` 
              : "No feature requests match your current filters. Try changing your filters or check back later."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 fade-in md:grid-cols-2 lg:grid-cols-3">
          {Array.isArray(requests) && requests.map((request) => (
            <FeatureRequestCard 
              key={request.id} 
              request={request} 
              isAdmin={isAdmin} 
              showDeleteButton={false} 
            />
          ))}
        </div>
      )}
    </div>
  )
}

