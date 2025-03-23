"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter, useSearchParams } from "next/navigation"
import { Filter } from "lucide-react"

export function FilterBar() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "all") {
      params.delete("status")
    } else {
      params.set("status", value)
    }
    router.push(`/?${params.toString()}`)
  }

  const handleDateChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "all") {
      params.delete("date")
    } else {
      params.set("date", value)
    }
    router.push(`/?${params.toString()}`)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 p-4 bg-card rounded-lg shadow-sm border border-muted/30 mb-6">
      <div className="flex items-center gap-2 text-muted-foreground mb-2 sm:mb-0 sm:mr-4">
        <Filter className="h-4 w-4" />
        <span className="text-sm font-medium">Filter Requests</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 flex-1">
        <Select defaultValue={searchParams.get("status") || "all"} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background/80 focus:ring-2 focus:ring-primary/40 transition-all duration-200">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="border-muted/40">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue={searchParams.get("date") || "all"} onValueChange={handleDateChange}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background/80 focus:ring-2 focus:ring-primary/40 transition-all duration-200">
            <SelectValue placeholder="Filter by date" />
          </SelectTrigger>
          <SelectContent className="border-muted/40">
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="day">Past 24 Hours</SelectItem>
            <SelectItem value="week">Past Week</SelectItem>
            <SelectItem value="month">Past Month</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

