"use client"

import { Badge } from "@/components/ui/badge"
import { FilterIcon } from "lucide-react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

type StatusFilterProps = {
  activeStatus: string | null
}

export function StatusFilter({ activeStatus }: StatusFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createQueryString = (name: string, value: string | null) => {
    const params = new URLSearchParams(searchParams?.toString())
    
    if (value === null) {
      params.delete(name)
    } else {
      params.set(name, value)
    }
    
    return params.toString()
  }

  const handleStatusFilter = (status: string | null) => {
    const queryString = createQueryString('status', status)
    router.push(`${pathname}${queryString ? `?${queryString}` : ''}`)
  }

  // Status filter UI configuration
  const statusFilters = [
    { value: null, label: 'All', color: 'bg-zinc-500/90 hover:bg-zinc-500' },
    { value: 'pending', label: 'Pending', color: 'bg-yellow-500/90 hover:bg-yellow-500' },
    { value: 'planned', label: 'Planned', color: 'bg-blue-500/90 hover:bg-blue-500' },
    { value: 'completed', label: 'Completed', color: 'bg-green-500/90 hover:bg-green-500' },
  ]

  return (
    <div className="flex items-center space-x-2 overflow-auto pb-1">
      <span className="text-sm font-medium text-muted-foreground flex items-center">
        <FilterIcon className="h-4 w-4 mr-1" />
        Status:
      </span>
      {statusFilters.map(filter => (
        <Badge
          key={filter.label}
          variant="secondary"
          className={`cursor-pointer transition-colors duration-200 ${
            activeStatus === filter.value ? filter.color + ' text-white' : 'hover:bg-zinc-200/80 dark:hover:bg-zinc-800/80'
          }`}
          onClick={() => handleStatusFilter(filter.value)}
        >
          {filter.label}
        </Badge>
      ))}
    </div>
  )
} 