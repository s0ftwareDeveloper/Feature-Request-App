"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PlusCircle, LogOut, LayoutDashboard, Inbox, RefreshCw } from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { useEffect, useState } from "react"
import Image from "next/image"


export function Header() {
  const { data: session, status, update } = useSession()
  const user = session?.user
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)

  // Debug user data when session changes
  useEffect(() => {
    if (session?.user) {
      console.log('Header - User data:', JSON.stringify(session.user, null, 2));
      console.log('Header - User image URL:', session.user.image);
      
      // Reset image states when the URL changes
      if (session.user.image) {
        setImgLoaded(false);
        setImgError(false);
      }
    }
  }, [session]);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" })
  }

  // Force session refresh
  const refreshSession = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await update(); // Force NextAuth to update the session
      console.log('Session refreshed');
    } catch (error) {
      console.error('Failed to refresh session:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get user initials for avatar
  const getInitials = () => {
    if (!user?.name) return "U"
    return user.name.split(" ")
      .map(name => name[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }
  
  // Determine if we should show the image or fallback
  const shouldShowImage = user?.image && !imgError;

  return (
    <header className="fixed top-0 left-0 right-0 border-b border-muted/40 backdrop-blur-xl bg-background/95 z-50 shadow-md">
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
              
              {/* Only display refresh button when missing image */}
              {(!user.image || imgError) && (
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-9 w-9 rounded-full" 
                  onClick={refreshSession}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="sr-only">Refresh session</span>
                </Button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="rounded-full w-9 h-9 p-0 relative overflow-hidden">
                    {shouldShowImage ? (
                      <img 
                        src={user.image!}
                        alt={user.name || "User"}
                        className="h-8 w-8 rounded-full object-cover"
                        onLoad={() => setImgLoaded(true)}
                        onError={() => {
                          console.error('Profile image failed to load:', user.image);
                          setImgError(true);
                        }}
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center border-2 border-primary/20">
                        <span className="text-xs font-medium">{getInitials()}</span>
                      </div>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 border-muted/40">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="h-8 w-8 relative rounded-full overflow-hidden">
                      {shouldShowImage ? (
                        <img 
                          src={user.image!}
                          alt={user.name || "User"}
                          className="h-full w-full object-cover"
                          onError={() => setImgError(true)}
                        />
                      ) : (
                        <div className="h-full w-full bg-muted flex items-center justify-center">
                          <span className="text-xs font-medium">{getInitials()}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col space-y-0.5">
                      <p className="text-sm font-medium">{user.name || 'User'}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/my-requests" className="cursor-pointer">My Requests</Link>
                  </DropdownMenuItem>
                  
                  {/* Add refresh option if no image */}
                  {(!user.image || imgError) && (
                    <>
                      <DropdownMenuItem 
                        onClick={refreshSession}
                        disabled={isRefreshing}
                        className="cursor-pointer"
                      >
                        <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>Refresh Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  
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