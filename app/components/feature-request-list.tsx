import { useEffect, useState } from 'react'
import api from '@/lib/axios'

type FeatureRequest = {
  id: string
  title: string
  description: string
  status: string
  upvotes: number
  createdAt: string
}

export default function FeatureRequestList() {
  const [requests, setRequests] = useState<FeatureRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const { data } = await api.get(`/api/requests?page=${page}`)
      
      setRequests(prev => page === 0 ? data.requests : [...prev, ...data.requests])
      setHasMore(data.hasMore)
      setError(null)
    } catch (error: any) {
      console.error("Error fetching requests:", error)
      setError("Failed to load feature requests. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [page])

  if (loading && page === 0) {
    return <div className="text-center py-8">Loading...</div>
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        {error}
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No feature requests yet. Be the first to submit one!
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {requests.map(request => (
        <div 
          key={request.id} 
          className="p-4 border rounded-lg shadow-sm"
        >
          <h3 className="font-semibold">{request.title}</h3>
          <p className="text-gray-600 mt-2">{request.description}</p>
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-gray-500">
              {new Date(request.createdAt).toLocaleDateString()}
            </span>
            <span className="text-sm">
              {request.upvotes} upvotes
            </span>
          </div>
        </div>
      ))}
      
      {hasMore && (
        <button
          onClick={() => setPage(p => p + 1)}
          className="w-full py-2 text-blue-600 hover:text-blue-800"
        >
          Load more
        </button>
      )}
    </div>
  )
} 