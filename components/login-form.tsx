"use client"

import type React from "react"
import { useState, Suspense } from "react" // Add Suspense here if needed later, not strictly needed if page wraps
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { signIn } from "next-auth/react"

// Renamed function to LoginForm
export function LoginForm() { 
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  // Check for error parameter in URL (from NextAuth)
  const error = searchParams.get("error")
  // More specific error mapping
  let errorMessage = "";
  if (error === "CredentialsSignin") {
    errorMessage = "Invalid email or password. Please try again.";
  } else if (error) {
    errorMessage = `Login failed: ${error}. Please try again.`;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password
      })
      
      if (result?.error) {
        // Use the mapped error message if available
        const description = result.error === "CredentialsSignin" 
          ? "Invalid email or password." 
          : "Please check your credentials and try again.";
        toast({
          title: "Login failed",
          description: description,
          variant: "destructive"
        })
        setIsLoading(false)
      } else {
        toast({
          title: "Login successful",
          description: "Redirecting you to the homepage..."
        })
        
        router.push("/")
        router.refresh() // Refresh server components
      }
    } catch (err) {
      console.error("Login error:", err)
      toast({
        title: "Login error",
        description: "An unexpected error occurred during login.",
        variant: "destructive"
      })
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    try {
      // Redirect to Google, callbackUrl handles the rest
      await signIn("google", { callbackUrl: "/" })
    } catch (err) {
      console.error("Google sign-in error:", err)
      toast({
        title: "Login error",
        description: "An error occurred initiating Google sign-in.",
        variant: "destructive"
      })
      setGoogleLoading(false) // Only reachable if signIn throws before redirect
    }
  }

  return (
    <div className="mx-auto max-w-[350px] space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Login</h1>
        <p className="text-muted-foreground">Enter your email below to login to your account</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            name="email" 
            type="email" 
            placeholder="m@example.com" 
            required 
            disabled={isLoading || googleLoading}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-required="true"
            aria-label="Email Address"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input 
            id="password" 
            name="password" 
            type="password" 
            required 
            disabled={isLoading || googleLoading}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-required="true"
            aria-label="Password"
          />
        </div>
        {errorMessage && (
          <div className="text-sm text-destructive" role="alert">
            {errorMessage}
          </div>
        )}
        <Button className="w-full" type="submit" disabled={isLoading || googleLoading} aria-label="Login with email and password">
          {isLoading ? "Logging in..." : "Login"}
        </Button>
      </form>
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <Button 
        variant="outline" 
        className="w-full flex items-center justify-center gap-2" 
        onClick={handleGoogleSignIn}
        disabled={isLoading || googleLoading}
        aria-label="Sign in with Google"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M15.545 6.558a9.42 9.42 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.689 7.689 0 0 1 5.352 2.082l-2.284 2.284A4.347 4.347 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.792 4.792 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.702 3.702 0 0 0 1.599-2.431H8v-3.08h7.545z"/>
        </svg>
        {googleLoading ? "Signing in..." : "Sign in with Google"}
      </Button>

      <div className="text-center text-sm">
        Don't have an account?{" "}
        <Link href="/register" className="underline">
          Sign up
        </Link>
      </div>
    </div>
  )
} 