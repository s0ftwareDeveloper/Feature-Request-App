"use client"

import { useSession } from "next-auth/react"

export function SessionStatusClient() {
  const { data: session, status } = useSession()
  
  return (
    <div className="my-4 p-4 border rounded bg-muted">
      <h2 className="text-lg font-bold">Session Debug</h2>
      <p>Status: {status}</p>
      <p>Session: {session ? 'Active' : 'None'}</p>
      {session && (
        <pre className="mt-2 p-2 bg-background rounded text-sm overflow-auto">
          {JSON.stringify(session, null, 2)}
        </pre>
      )}
    </div>
  )
} 