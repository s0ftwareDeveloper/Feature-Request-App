"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { signIn } from "next-auth/react"

export default function Login() {
  const router = useRouter()
  const { toast } = useToast()
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    
    try {
      console.log("Attempting login with:", { email, password: "***" })
      
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password
      })
      
      console.log("Sign in result:", result)
      
      if (result?.error) {
        setError("Invalid email or password")
        setIsLoading(false)
      } else {
        toast({
          title: "Login successful",
          description: "Redirecting you to the homepage...",
        })
        
        setTimeout(() => {
          router.push("/")
          router.refresh()
        }, 500)
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("An error occurred during login")
      setIsLoading(false)
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
            disabled={isLoading}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input 
            id="password" 
            name="password" 
            type="password" 
            required 
            disabled={isLoading}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <div className="text-sm text-destructive">
            {error}
          </div>
        )}
        <Button className="w-full" type="submit" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login"}
        </Button>
      </form>
      <div className="text-center text-sm">
        Don't have an account?{" "}
        <Link href="/register" className="underline">
          Sign up
        </Link>
      </div>
    </div>
  )
}

