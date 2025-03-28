"use client"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ThumbsUp, Trash } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { formatDistanceToNow } from "date-fns"
import { useAuth } from "@/hooks/use-auth"
import api from "@/lib/axios"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

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
  showDeleteButton?: boolean
}

export function FeatureRequestCard({ 
  request, 
  isAdmin, 
  showDeleteButton = false 
}: FeatureRequestCardProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [upvotes, setUpvotes] = useState(request.upvotes)
  const [hasUpvoted, setHasUpvoted] = useState(request.hasUpvoted)
  const [status, setStatus] = useState(request.status)
  const { toast } = useToast()

  const refreshRequestData = async () => {
    try {
      console.log(`Refreshing data for request ${request.id}`)
      const { data } = await api.get(`/requests/${request.id}`)
      console.log("Received updated data:", data)

      if (data && typeof data.upvotes === 'number') {
        if (data.upvotes !== upvotes) {
          setUpvotes(data.upvotes)
        }
        if (!!data.hasUpvoted !== hasUpvoted) {
          setHasUpvoted(!!data.hasUpvoted)
        }
      } else {
        console.warn("Received invalid data format during refresh:", data)
      }
    } catch (error: any) {
      console.error("Error refreshing request data:", error)
      // Enhanced error reporting for refreshRequestData
      console.error("REFRESH ERROR DETAILS:", {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        message: error?.message
      });
    }
  }

  const handleUpvote = async () => {
    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please log in to upvote feature requests",
        variant: "default",
      })
      
      setTimeout(() => {
        router.push('/login');
      }, 1000);
      return;
    }

    const previousUpvotes = upvotes;
    const previousHasUpvoted = hasUpvoted;

    try {
      if (hasUpvoted) {
        setUpvotes(prev => Math.max(0, prev - 1));
        setHasUpvoted(false);

        console.log(`Attempting to DELETE upvote for request ${request.id}`);
        await api.delete(`/upvote/${request.id}`);
        console.log("Upvote removal request sent successfully.");

      } else {
        setUpvotes(prev => prev + 1);
        setHasUpvoted(true);

        console.log(`Attempting to POST upvote for request ${request.id}`);
        const response = await api.post(`/upvote/${request.id}`);
        console.log(`Upvote addition request sent. Status: ${response.status}`, response.data);

        if (response.status === 200) {
          console.log("Server indicated upvote already existed.");
          // UI already reflects this optimistically
        } else if (response.status === 201) {
          console.log("Server confirmed new upvote created.");
          // UI already reflects this optimistically
        }
      }

      setTimeout(refreshRequestData, 500);

    } catch (error: any) {
      console.error(`Initial upvote action failed for request ${request.id}:`, error);
      
      // Enhanced error reporting
      const errorDetails = {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        message: error?.message,
        stack: error?.stack
      };
      
      console.error("DETAILED CLIENT ERROR:", errorDetails);

      console.log(`Rolling back optimistic UI update for request ${request.id} due to initial action failure.`);
      setUpvotes(previousUpvotes);
      setHasUpvoted(previousHasUpvoted);

      if (error?.response?.status === 401) {
        toast({
          title: "Session expired",
          description: "Please log in again to continue",
          variant: "default",
        })
        setTimeout(() => {
          router.push('/login');
        }, 1000);
      } else {
        // More detailed error toast
        toast({
          title: "Upvote Error",
          description: error?.response?.data?.message || 
                      `Could not update upvote status. Server error: ${error?.response?.status || 'unknown'}`,
          variant: "destructive",
        })
        
        // In development, show a more detailed error toast
        if (process.env.NODE_ENV === "development") {
          toast({
            title: "Detailed Error Info",
            description: `Error: ${JSON.stringify(errorDetails, null, 2).substring(0, 255)}...`,
            variant: "destructive",
          })
        }
      }
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

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.patch(`/requests/${request.id}/status`, { status: newStatus })
      setStatus(newStatus)
      toast({
        title: "Status updated",
        description: `Request marked as ${newStatus}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      })
    }
  }

  const statusColors = {
    pending: "bg-yellow-500/90 hover:bg-yellow-500",
    planned: "bg-blue-500/90 hover:bg-blue-500",
    completed: "bg-green-500/90 hover:bg-green-500",
  }

  return (
    <Card className="card-hover border-border overflow-hidden shadow flex flex-col h-full">
      <CardHeader className="pb-2 space-y-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-xl font-medium">{request.title}</CardTitle>
          <Badge className={`${statusColors[status as keyof typeof statusColors]} transition-colors duration-200`}>
            {status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/60 mr-1"></span>
          {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
        </p>
      </CardHeader>
      <CardContent className="pb-6 flex-grow">
        <p className="text-muted-foreground/90 leading-relaxed">{request.description}</p>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-between py-2 border-t border-border mt-auto gap-2">
        <Button
          variant={hasUpvoted ? "default" : "outline"}
          size="sm"
          onClick={handleUpvote}
          className={`gap-2 transition-all duration-200 ${
            hasUpvoted 
              ? 'bg-primary text-primary-foreground' 
              : session 
                ? 'hover:bg-primary/10' 
                : 'hover:bg-primary/5 hover:border-primary/30'
          }`}
          title={session ? (hasUpvoted ? "Remove upvote" : "Upvote this request") : "Log in to upvote"}
        >
          <ThumbsUp className={`h-4 w-4 ${hasUpvoted ? 'fill-current' : ''}`} />
          <span>{session ? (hasUpvoted ? "Upvoted" : "Upvote") : "Login to Upvote"}</span>
          <Badge variant="secondary" className="ml-1 font-medium">
            {upvotes}
          </Badge>
        </Button>
        
        {isAdmin && (
          <Select defaultValue={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[130px] focus:ring-2 focus:ring-primary/40">
              <SelectValue placeholder="Change status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        )}
        
        {(showDeleteButton && request.isOwner || isAdmin) && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon" className="hover:bg-destructive/90 transition-colors flex-shrink-0 ml-auto">
                <Trash className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-muted/40">
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this feature request.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="hover:bg-muted/80 transition-colors">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 transition-colors">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardFooter>
    </Card>
  )
}

