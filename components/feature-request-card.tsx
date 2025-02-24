"use client"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowBigUp, Trash2 } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { formatDistanceToNow } from "date-fns"
import { StatusChangeButton } from "./status-change-button"
import { useAuth } from "@/hooks/use-auth"
import api from "@/lib/axios"

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

type FeatureRequestCardProps = {
  request: FeatureRequest
  isAdmin?: boolean
}

export function FeatureRequestCard({ request, isAdmin }: FeatureRequestCardProps) {
  const { user } = useAuth()
  const [upvotes, setUpvotes] = useState(request.upvotes)
  const [hasUpvoted, setHasUpvoted] = useState(request.hasUpvoted)
  const { toast } = useToast()

  const handleUpvote = async () => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to upvote requests",
      })
      return
    }

    try {
      await api[hasUpvoted ? "delete" : "post"](`/upvote/${request.id}`)
      setUpvotes(hasUpvoted ? upvotes - 1 : upvotes + 1)
      setHasUpvoted(!hasUpvoted)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update upvote",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/requests/${request.id}`)
      toast({
        title: "Success",
        description: "Feature request deleted",
      })
      window.location.reload()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete request",
        variant: "destructive",
      })
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <h3 className="font-semibold">{request.title}</h3>
          <p className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
          </p>
        </div>
        <Badge variant={request.status === "completed" ? "default" : "secondary"}>
          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
        </Badge>
        {isAdmin && (
          <div className="ml-2">
            <StatusChangeButton requestId={request.id} currentStatus={request.status} />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{request.description}</p>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant={hasUpvoted ? "default" : "outline"} size="sm" onClick={handleUpvote}>
          <ArrowBigUp className="w-4 h-4 mr-2" />
          {upvotes}
        </Button>
        {request.isOwner && (
          <Button variant="ghost" size="sm" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

