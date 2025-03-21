import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { signJWT } from '@/lib/jwt'
import { POST } from './route'
import { prisma } from '@/lib/prisma'
import * as jwt from '@/lib/jwt'

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

jest.mock('@/lib/jwt', () => ({
  signJWT: jest.fn()
}))

const mockCookieSet = jest.fn()
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    set: mockCookieSet
  }))
}))

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCookieSet.mockClear()
  })

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    password: 'hashedPassword',
    role: 'user'
  }

  const mockToken = 'mock-jwt-token'

  it('should return 400 if email is missing', async () => {
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'password123' })
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
    expect(await response.text()).toBe('Missing email or password')
  })

  it('should return 400 if password is missing', async () => {
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' })
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
    expect(await response.text()).toBe('Missing email or password')
  })

  it('should return 401 if user is not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
    })
    const response = await POST(request)
    expect(response.status).toBe(401)
    expect(await response.text()).toBe('Invalid credentials')
  })

  it('should return 401 if user has no password', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      password: null,
      role: 'user'
    })
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
    })
    const response = await POST(request)
    expect(response.status).toBe(401)
    expect(await response.text()).toBe('Invalid credentials')
  })

  it('should return 401 if password is invalid', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      password: 'hashedPassword',
      role: 'user'
    })
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'wrongpassword' })
    })
    const response = await POST(request)
    expect(response.status).toBe(401)
    expect(await response.text()).toBe('Invalid credentials')
  })

  it('should return 500 if there is an internal error', async () => {
    (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'))
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
    })
    const response = await POST(request)
    expect(response.status).toBe(500)
    expect(await response.text()).toBe('Internal error')
  })

  it('should return 500 if request body is invalid JSON', async () => {
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: 'invalid-json'
    })
    const response = await POST(request)
    expect(response.status).toBe(500)
    expect(await response.text()).toBe('Internal error')
  })

  it('should successfully log in a user with valid credentials', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    ;(jwt.signJWT as jest.Mock).mockResolvedValue(mockToken)
    
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data).toEqual({
      user: {
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role
      }
    })
    
    // Verify cookie was set
    expect(mockCookieSet).toHaveBeenCalledWith({
      name: 'token',
      value: mockToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expect.any(Date)
    })
  })

  it('should handle user with undefined role', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      password: 'hashedPassword',
      role: undefined
    }
    const mockToken = 'mock-jwt-token'
    
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    ;(jwt.signJWT as jest.Mock).mockResolvedValue(mockToken)
    
    const request = new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data).toEqual({
      user: {
        id: mockUser.id,
        email: mockUser.email,
        role: 'user' // Default role
      }
    })
  })
}) 