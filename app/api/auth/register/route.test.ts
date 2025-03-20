import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { POST } from './route'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn()
    }
  }
}))

jest.mock('bcryptjs', () => ({
  hash: jest.fn()
}))

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword',
    role: 'user'
  }

  const mockUserWithoutPassword = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user'
  }

  it('should register a new user successfully', async () => {
    // Mock user lookup (no existing user)
    ;(require('@/lib/prisma').prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
    // Mock password hashing
    ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword')
    // Mock user creation
    ;(require('@/lib/prisma').prisma.user.create as jest.Mock).mockResolvedValue(mockUser)

    const request = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toEqual(mockUserWithoutPassword)
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10)
    expect(require('@/lib/prisma').prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'test@example.com',
        password: 'hashedPassword',
        name: 'Test User',
        role: 'user'
      }
    })
  })

  it('should return 400 when required fields are missing', async () => {
    const request = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    expect(await response.text()).toBe('Missing required fields')
  })

  it('should return 409 when user already exists', async () => {
    ;(require('@/lib/prisma').prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

    const request = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(409)
    expect(await response.text()).toBe('User already exists')
  })

  it('should return 500 when database error occurs', async () => {
    ;(require('@/lib/prisma').prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'))

    const request = new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(500)
    expect(await response.text()).toBe('Internal server error')
  })
}) 