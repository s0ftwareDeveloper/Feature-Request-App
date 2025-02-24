"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { CheckCircle2 } from "lucide-react"
import api from "@/lib/axios"

export default function NewRequest() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      await api.post("/requests", {
        title: formData.get("title"),
        description: formData.get("description"),
      })

      setIsSuccess(true)
      setTimeout(() => {
        router.push("/")
        router.refresh()
      }, 1500)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data || "Failed to submit request",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="mx-auto max-w-[350px] space-y-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
        <h1 className="text-2xl font-bold">Request Submitted!</h1>
        <p className="text-muted-foreground">Redirecting you back to the home page...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[600px] space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Submit Feature Request</h1>
        <p className="text-muted-foreground">Share your idea with the community</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" maxLength={100} required placeholder="Enter a clear, concise title" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            maxLength={500}
            required
            placeholder="Describe your feature request in detail"
            className="h-32"
          />
        </div>
        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </form>
    </div>
  )
}

