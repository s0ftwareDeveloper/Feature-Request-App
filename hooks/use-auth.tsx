"use client"

import { useSession, signIn, signOut } from "next-auth/react"

export function useAuth() {
  const { data: session, status } = useSession()
  
  return {
    user: session?.user,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    login: (email: string, password: string) => signIn("credentials", { 
      email, 
      password,
      callbackUrl: "/" 
    }),
    logout: () => signOut({ callbackUrl: "/" }),
  }
} 