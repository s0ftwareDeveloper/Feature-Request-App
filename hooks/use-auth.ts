import { create } from "zustand"
import { persist } from "zustand/middleware"
import { signIn, signOut, useSession } from "next-auth/react"

type User = {
  id: string
  email: string
  role: string
}

type AuthState = {
  checkAuth: () => Promise<void>
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      checkAuth: async () => {
        // Next-auth handles this through the SessionProvider
      },
      login: async (email: string, password: string) => {
        try {
          const result = await signIn("credentials", {
            redirect: false,
            email,
            password,
          })
          
          return !result?.error
        } catch (error: any) {
          console.error("Login error:", error)
          return false
        }
      },
      logout: async () => {
        await signOut({ callbackUrl: "/" })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({}), // Don't persist any state, let NextAuth handle it
    }
  )
)

// Helper hook to get current user from NextAuth session
export const useCurrentUser = () => {
  const { data: session } = useSession()
  return session?.user as User | null
}

