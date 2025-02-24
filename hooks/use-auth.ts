import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import api from "@/lib/axios"

type User = {
  id: string
  email: string
  role: string
}

type AuthState = {
  user: User | null
  isInitialized: boolean
  checkAuth: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isInitialized: false,
      checkAuth: async () => {
        try {
          const { data } = await api.get("/auth/me")
          set({ user: data.user, isInitialized: true })
        } catch (error) {
          console.error("Auth check error:", error)
          set({ user: null, isInitialized: true })
        }
      },
      login: async (email: string, password: string) => {
        try {
          const { data } = await api.post("/auth/login", { email, password })
          set({ user: data.user, isInitialized: true })
          // Use Next.js router instead of window.location
          window.location.href = "/"
        } catch (error: any) {
          console.error("Login error:", error.response?.data || error.message)
          throw error
        }
      },
      logout: async () => {
        try {
          await api.post("/auth/logout")
          set({ user: null, isInitialized: true })
          window.location.href = "/"
        } catch (error) {
          console.error("Logout error:", error)
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
    }
  )
)

