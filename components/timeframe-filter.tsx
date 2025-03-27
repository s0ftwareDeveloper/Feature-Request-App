"use client"

import { Badge } from "@/components/ui/badge"
import { ClockIcon } from "lucide-react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

type TimeframeFilterProps = {
  activeTimeframe: string | null
}

export function TimeframeFilter({ activeTimeframe }: TimeframeFilterProps) {
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

  const handleTimeframeFilter = (timeframe: string | null) => {
    const queryString = createQueryString('timeframe', timeframe)
    router.push(`${pathname}${queryString ? `?${queryString}` : ''}`)
  }

  // Timeframe filter UI configuration
  const timeframeFilters = [
    { value: null, label: 'All Time', color: 'bg-zinc-500/90 hover:bg-zinc-500' },
    { value: '24h', label: 'Past 24h', color: 'bg-purple-500/90 hover:bg-purple-500' },
    { value: 'week', label: 'Past Week', color: 'bg-indigo-500/90 hover:bg-indigo-500' },
    { value: 'month', label: 'Past Month', color: 'bg-cyan-500/90 hover:bg-cyan-500' },
  ]

  return (
    <div className="flex items-center space-x-2 overflow-auto pb-1">
      <span className="text-sm font-medium text-muted-foreground flex items-center">
        <ClockIcon className="h-4 w-4 mr-1" />
        Time:
      </span>
      {timeframeFilters.map(filter => (
        <Badge
          key={filter.label}
          variant="secondary"
          className={`cursor-pointer transition-colors duration-200 ${
            activeTimeframe === filter.value ? filter.color + ' text-white' : 'hover:bg-zinc-200/80 dark:hover:bg-zinc-800/80'
          }`}
          onClick={() => handleTimeframeFilter(filter.value)}
        >
          {filter.label}
        </Badge>
      ))}
    </div>
  )
} 