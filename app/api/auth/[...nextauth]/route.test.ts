import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions, handlers } from './route'
import { Session } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import { AdapterUser } from 'next-auth/adapters'

// Mock NextAuth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}))

describe('NextAuth API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/auth/[...nextauth]', () => {
    const mockSession = {
      user: { 
        id: 'user-1', 
        email: 'test@example.com',
        role: 'user'
      },
      expires: '2025-03-21T00:27:18.325Z'
    }

    it('should return session data when session exists', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession)
      const request = new Request('http://localhost:3000/api/auth/session')
      const response = await handlers.GET(request)
      expect(response).toEqual(mockSession)
      expect(getServerSession).toHaveBeenCalledWith(authOptions)
    })

    it('should return empty object when no session exists', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null)
      const request = new Request('http://localhost:3000/api/auth/session')
      const response = await handlers.GET(request)
      expect(response).toEqual({})
    })

    it('should handle errors gracefully', async () => {
      (getServerSession as jest.Mock).mockRejectedValue(new Error('Session error'))
      const request = new Request('http://localhost:3000/api/auth/session')
      const response = await handlers.GET(request)
      expect(response).toEqual({})
    })
  })

  describe('POST /api/auth/[...nextauth]', () => {
    const mockSession = {
      user: { 
        id: 'user-1', 
        email: 'test@example.com',
        role: 'user'
      },
      expires: '2025-03-21T00:27:18.327Z'
    }

    it('should handle valid credentials', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession)
      const request = new Request('http://localhost:3000/api/auth/callback/credentials', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      })
      const response = await handlers.POST(request)
      expect(response).toEqual(mockSession)
    })

    it('should handle invalid JSON in request body', async () => {
      const request = new Request('http://localhost:3000/api/auth/callback/credentials', {
        method: 'POST',
        body: 'invalid-json'
      })
      const response = await handlers.POST(request)
      expect(response).toEqual({})
    })

    it('should handle missing request body', async () => {
      const request = new Request('http://localhost:3000/api/auth/callback/credentials', {
        method: 'POST'
      })
      const response = await handlers.POST(request)
      expect(response).toEqual({})
    })

    it('should handle session error', async () => {
      (getServerSession as jest.Mock).mockRejectedValue(new Error('Session error'))
      const request = new Request('http://localhost:3000/api/auth/callback/credentials', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      })
      const response = await handlers.POST(request)
      expect(response).toEqual({})
    })
  })

  describe('session callback', () => {
    it('should handle session callback with user data', async () => {
      const session = { user: { name: 'Test User' } } as Session
      const user: AdapterUser = { 
        id: 'user-1', 
        email: 'test@example.com', 
        emailVerified: null,
        role: 'user' 
      }
      const result = await authOptions.callbacks?.session?.({ 
        session, 
        user,
        token: {} as JWT,
        newSession: undefined,
        trigger: 'update'
      })
      expect(result?.user).toEqual({ ...session.user, ...user })
    })

    it('should handle session callback with token data', async () => {
      const session = {
        user: {
          name: 'Test User'
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      } as Session
      const token = {
        sub: 'user-1',
        role: 'user',
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
        jti: 'test-jti'
      } as JWT
      const user = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: null
      } as AdapterUser
      const newSession = { ...session }
      const result = await authOptions.callbacks?.session?.({
        session,
        token,
        user,
        newSession,
        trigger: 'update'
      })
      expect(result?.user).toEqual({
        name: 'Test User',
        id: 'user-1',
        role: 'user'
      })
    })

    it('should handle session callback errors', async () => {
      const session = { user: { name: 'Test User' } } as Session
      const result = await authOptions.callbacks?.session?.({ 
        session,
        user: {} as AdapterUser,
        token: {} as JWT,
        newSession: undefined,
        trigger: 'update'
      })
      expect(result).toEqual(session)
    })
  })
}) 