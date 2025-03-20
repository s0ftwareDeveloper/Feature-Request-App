import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/jwt'
import { GET } from './route'

// Mock dependencies
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}))

jest.mock('@/lib/jwt', () => ({
  verifyJWT: jest.fn()
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn()
    }
  }
}))

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    role: 'user'
  }

  const mockToken = 'mock-jwt-token'
  const mockPayload = {
    id: 'user-1',
    email: 'test@example.com',
    role: 'user'
  }

  it('should return user data when valid token is provided', async () => {
    // Mock cookie
    ;(cookies as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({ value: mockToken })
    })
    // Mock JWT verification
    ;(verifyJWT as jest.Mock).mockResolvedValue(mockPayload)
    // Mock user lookup
    ;(require('@/lib/prisma').prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.user).toEqual(mockUser)
  })

  it('should return 401 when no token is provided', async () => {
    ;(cookies as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue(undefined)
    })

    const response = await GET()
    expect(response.status).toBe(401)
    expect(await response.text()).toBe('Unauthorized')
  })

  it('should return 401 when token is invalid', async () => {
    ;(cookies as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({ value: mockToken })
    })
    ;(verifyJWT as jest.Mock).mockResolvedValue(null)

    const response = await GET()
    expect(response.status).toBe(401)
    expect(await response.text()).toBe('Invalid token')
  })

  it('should return 404 when user is not found', async () => {
    ;(cookies as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({ value: mockToken })
    })
    ;(verifyJWT as jest.Mock).mockResolvedValue(mockPayload)
    ;(require('@/lib/prisma').prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

    const response = await GET()
    expect(response.status).toBe(404)
    expect(await response.text()).toBe('User not found')
  })

  it('should return 500 when database error occurs', async () => {
    ;(cookies as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue({ value: mockToken })
    })
    ;(verifyJWT as jest.Mock).mockResolvedValue(mockPayload)
    ;(require('@/lib/prisma').prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'))

    const response = await GET()
    expect(response.status).toBe(500)
    expect(await response.text()).toBe('Internal error')
  })
}) 