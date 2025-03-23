"use client"

import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../hooks'
import { loginSuccess, logout, User } from '../slices/userSlice'

export function UserExample() {
  const dispatch = useAppDispatch()
  const { isAuthenticated, user, loading, error } = useAppSelector((state) => state.user)

  // Example of how to dispatch actions
  const handleLogin = () => {
    // In a real app, this would come from your authentication service
    const user: User = {
      id: '1',
      email: 'user@example.com',
      name: 'Example User',
      role: 'user'
    }
    
    dispatch(loginSuccess(user))
  }

  const handleLogout = () => {
    dispatch(logout())
  }

  // User state information
  return (
    <div className="p-4 border rounded-md">
      <h2 className="text-xl font-bold mb-4">Redux User State Example</h2>
      
      <div className="mb-4">
        <p><strong>Authentication Status:</strong> {isAuthenticated ? 'Logged In' : 'Logged Out'}</p>
        {user && (
          <div>
            <p><strong>User ID:</strong> {user.id}</p>
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            {user.role && <p><strong>Role:</strong> {user.role}</p>}
          </div>
        )}
        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
      </div>
      
      <div className="flex gap-4">
        <button
          onClick={handleLogin}
          disabled={isAuthenticated}
          className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50"
        >
          Login
        </button>
        <button
          onClick={handleLogout}
          disabled={!isAuthenticated}
          className="px-4 py-2 bg-red-500 text-white rounded-md disabled:opacity-50"
        >
          Logout
        </button>
      </div>
    </div>
  )
} 