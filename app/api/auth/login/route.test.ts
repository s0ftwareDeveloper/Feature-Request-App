import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { signJWT } from '@/lib/jwt'
import { POST } from './route'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn()
    }
  }
}))

jest.mock('bcryptjs', () => ({
  compare: jest.fn()
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn()
}))

jest.mock('@/lib/jwt', () => ({
  signJWT: jest.fn()
}))

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    password: 'hashedPassword',
    role: 'user'
  }

  const mockToken = 'mock-jwt-token'

  it('should login successfully with valid credentials', async () => {
    // Mock successful password comparison
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    // Mock JWT signing
    ;(signJWT as jest.Mock).mockResolvedValue(mockToken)
    // Mock cookie setting
    const mockSet = jest.fn()
    ;(cookies as jest.Mock).mockReturnValue({ set: mockSet })
    // Mock user lookup
    ;(require('@/lib/prisma').prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.user).toEqual({
      id: mockUser.id,
      email: mockUser.email,
      role: mockUser.role
    })
    expect(mockSet).toHaveBeenCalledWith({
      name: 'token',
      value: mockToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expect.any(Date)
    })
  })

  it('should return 400 when credentials are missing', async () => {
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com'
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    expect(await response.text()).toBe('Missing email or password')
  })

  it('should return 401 when user is not found', async () => {
    ;(require('@/lib/prisma').prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'password123'
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
    expect(await response.text()).toBe('Invalid credentials')
  })

  it('should return 401 when password is invalid', async () => {
    ;(require('@/lib/prisma').prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpassword'
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
    expect(await response.text()).toBe('Invalid credentials')
  })

  it('should return 500 when database error occurs', async () => {
    ;(require('@/lib/prisma').prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'))

    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(500)
    expect(await response.text()).toBe('Internal error')
  })
}) 