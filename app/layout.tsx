import type React from "react"
import type { Metadata } from "next"
import dynamic from 'next/dynamic' // Import dynamic
import { Inter } from "next/font/google" // Uncomment font import
// import { Inter } from "next/font/google" // Temporarily comment out font import
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
// Static import replaced by dynamic import below
// import { Header } from "../components/header" 
import { Providers } from "@/components/providers"

// Comment out DummyClient import
// const DummyClient = dynamic(() => import('@/components/dummy-client').then(mod => mod.DummyClient), {
//   ssr: false, 
// });

// Update Header dynamic import path to be relative to app dir
const Header = dynamic(() => import('./header-component').then(mod => mod.Header), {
  ssr: false, 
  // loading: () => <div className="h-16">{/* Placeholder height */}</div> // Optional loading state
});

const inter = Inter({ subsets: ["latin"] }) // Uncomment font definition

export const metadata: Metadata = {
  title: "Feature Request System",
  description: "Submit and track feature requests",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {/* <DummyClient /> */} {/* Comment out DummyClient usage */}
          <Header /> {/* Uncomment Header usage */}
          <main className="container mx-auto px-4 pt-20 pb-16 min-h-[calc(100vh-64px)]">
            {children}
          </main>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}

import './globals.css'