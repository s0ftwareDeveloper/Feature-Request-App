import { useSession, signOut } from "next-auth/react"
import { useAuth } from "@/hooks/use-auth"

export default function Header() {
  const { data: session } = useSession()
  const { logout } = useAuth()

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Feature Requests</h1>
        <div className="flex items-center space-x-4">
          {session ? (
            <>
              <span className="text-gray-700">{session.user?.email}</span>
              <button
                onClick={() => logout()}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Logout
              </button>
            </>
          ) : (
            <a
              href="/login"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Login
            </a>
          )}
        </div>
      </div>
    </header>
  )
} 