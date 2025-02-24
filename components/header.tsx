"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

export function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold text-xl">
            Feature Requests
          </Link>
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              All Requests
            </Link>
            {user && (
              <Link href="/my-requests" className="text-muted-foreground hover:text-foreground">
                My Requests
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Button asChild>
                <Link href="/new">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  New Request
                </Link>
              </Button>
              <Button variant="ghost" onClick={logout}>
                Log Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/register">Create Account</Link>
              </Button>
              <Button asChild>
                <Link href="/login">Log In</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

