"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PlusCircle, LogOut, LayoutDashboard, Inbox } from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"

export function Header() {
  const { data: session } = useSession()
  const user = session?.user

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" })
  }

  // Get user initials for avatar
  const getInitials = () => {
    if (!user?.name) return "U"
    return user.name.split(" ")
      .map(name => name[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <header className="border-b border-muted/40 backdrop-blur-sm bg-background/95 sticky top-0 z-10 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold text-xl flex items-center gap-2">
            <span className="bg-primary text-primary-foreground w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold">FR</span>
            <span className="hidden sm:inline">Feature Requests</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm font-medium flex items-center gap-1.5">
              <Inbox className="w-4 h-4" />
              All Requests
            </Link>
            {user && (
              <Link href="/my-requests" className="text-muted-foreground hover:text-foreground transition-colors duration-200 text-sm font-medium flex items-center gap-1.5">
                <LayoutDashboard className="w-4 h-4" />
                My Requests
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Button asChild className="shadow-sm">
                <Link href="/new" className="flex items-center">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">New Request</span>
                  <span className="sm:hidden">New</span>
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="rounded-full w-9 h-9 p-0">
                    <Avatar className="h-8 w-8 border-2 border-primary/20">
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 border-muted/40">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-0.5">
                      <p className="text-sm font-medium">{user.name || 'User'}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/my-requests" className="cursor-pointer">My Requests</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive cursor-pointer"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild className="text-sm">
                <Link href="/register">Create Account</Link>
              </Button>
              <Button asChild className="shadow-sm">
                <Link href="/login">Log In</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

