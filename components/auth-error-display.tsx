"use client"

import React from 'react'; // Import React
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

// Renamed component
export function AuthErrorDisplay() { 
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  const errorMessages: Record<string, string> = {
    default: "An authentication error occurred. Please try again.",
    Configuration: "There is a problem with the server configuration.",
    AccessDenied: "You have denied access to your account.",
    OAuthSignin: "Error during OAuth sign-in. Please try again.",
    OAuthCallback: "Error during OAuth callback. Please try again.",
    OAuthCreateAccount: "There was a problem creating your account. You may already have an account with this email address. Try signing in with your email and password instead.",
    EmailCreateAccount: "There was a problem creating your account. Please try again.",
    Callback: "Error during callback processing. Please try again.",
    OAuthAccountNotLinked: "This email is already associated with another account. Please sign in using the original provider.",
    EmailSignin: "Error sending verification email. Please try again.",
    CredentialsSignin: "Invalid email or password. Please try again.",
    SessionRequired: "You must be signed in to access this page.",
  }

  const errorMessage = errorMessages[error || ""] || errorMessages.default

  return (
    <div className="mx-auto max-w-[600px] space-y-6 pt-12">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>Authentication Error</AlertTitle>
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
      
      <div className="flex justify-center gap-4">
        <Button asChild variant="outline">
          <Link href="/login">Try Again</Link>
        </Button>
        <Button asChild>
          <Link href="/">Return Home</Link>
        </Button>
      </div>
    </div>
  )
} 