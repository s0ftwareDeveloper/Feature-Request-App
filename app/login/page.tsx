import React, { Suspense } from 'react'
import { LoginForm } from "@/components/login-form"

// Define a simple loading fallback component
function LoadingFallback() {
  return <div className="text-center p-8">Loading...</div>;
}

// This page component remains a Server Component (or can be)
export default function LoginPage() {
  return (
    // Wrap the client component using Suspense
    <Suspense fallback={<LoadingFallback />}>
      <LoginForm />
    </Suspense>
  )
}

