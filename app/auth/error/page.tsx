"use client"

import React, { Suspense } from 'react'
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { AuthErrorDisplay } from "@/components/auth-error-display"

// Define a simple loading fallback component
function LoadingFallback() {
  return <div className="text-center p-8">Loading error details...</div>;
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthErrorDisplay />
    </Suspense>
  )
} 