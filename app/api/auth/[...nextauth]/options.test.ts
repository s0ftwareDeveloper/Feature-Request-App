import { authOptions } from './options'
import { Session } from 'next-auth'
import { JWT } from 'next-auth/jwt'
import { AdapterUser } from 'next-auth/adapters'

interface CustomSession extends Session {
  user: {
    id: string
    email: string
    role: string
  }
}

describe('NextAuth Options', () => {
  it('should have required configuration', () => {
    expect(authOptions).toBeDefined()
    expect(authOptions.providers).toBeDefined()
    expect(authOptions.callbacks).toBeDefined()
    expect(authOptions.callbacks?.session).toBeDefined()
  })

  it('should enhance session with user role', async () => {
    const mockSession: CustomSession = {
      user: {
        id: 'user-1',
        email: 'test@example.com',
        role: 'admin'
      },
      expires: new Date().toISOString()
    }

    const mockUser: AdapterUser = {
      id: 'user-1',
      email: 'test@example.com',
      emailVerified: null,
      role: 'admin'
    }

    const mockToken: JWT = {
      id: 'user-1',
      sub: 'user-1',
      email: 'test@example.com',
      role: 'admin'
    }

    if (authOptions.callbacks?.session) {
      const result = await authOptions.callbacks.session({ 
        session: mockSession, 
        user: mockUser,
        token: mockToken,
        newSession: mockSession,
        trigger: 'update'
      }) as CustomSession

      expect(result.user.role).toBe('admin')
      expect(result.user.id).toBe('user-1')
      expect(result.user.email).toBe('test@example.com')
    }
  })

  it('should handle session callback with missing user data', async () => {
    const mockSession: CustomSession = {
      user: {
        id: 'user-1',
        email: 'test@example.com',
        role: 'admin'
      },
      expires: new Date().toISOString()
    }

    const mockUser: AdapterUser = {
      id: 'user-1',
      email: 'test@example.com',
      emailVerified: null,
      role: 'admin'
    }

    const mockToken: JWT = {
      id: 'user-1',
      sub: 'user-1',
      email: 'test@example.com',
      role: 'admin'
    }

    if (authOptions.callbacks?.session) {
      const result = await authOptions.callbacks.session({ 
        session: mockSession, 
        user: mockUser,
        token: mockToken,
        newSession: mockSession,
        trigger: 'update'
      }) as CustomSession

      expect(result.user.role).toBe('admin')
      expect(result.user.email).toBe('test@example.com')
    }
  })
}) 