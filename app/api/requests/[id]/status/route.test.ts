import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { mockDeep } from 'jest-mock-extended'
import { getServerSession } from 'next-auth/next'

// First declare the mock object to avoid reference error
const mockPrisma = mockDeep<PrismaClient>()

// Now use the mock in your jest.mock calls
jest.mock('@/lib/prisma', () => ({
  __esModule: true, 
  prisma: mockPrisma
}))

// Mock authOptions
jest.mock('@/app/api/auth/[...nextauth]/options', () => ({
  authOptions: {}
}), { virtual: true })

// Mock NextAuth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}))

// Import the actual handler
import { PATCH } from './route'

describe('PATCH /api/requests/[id]/status', () => {
  const mockSession = {
    user: {
      id: 'user-1',
      email: 'admin@example.com',
      role: 'admin'
    }
  }

  const mockRequest = {
    id: 'request-1',
    title: 'Test Request',
    description: 'Test Description',
    status: 'pending',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should update status when admin makes valid request', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession)
    mockPrisma.featureRequest.update.mockResolvedValue({
      ...mockRequest,
      status: 'planned'
    })

    const request = new Request('http://localhost:3000/api/requests/request-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'planned' })
    })

    const response = await PATCH(request, { params: { id: 'request-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('planned')
    expect(mockPrisma.featureRequest.update).toHaveBeenCalledWith({
      where: { id: 'request-1' },
      data: { status: 'planned' }
    })
  })

  it('should return 403 when non-admin user attempts to update status', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', role: 'user' }
    })

    const request = new Request('http://localhost:3000/api/requests/request-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'planned' })
    })

    const response = await PATCH(request, { params: { id: 'request-1' } })
    expect(response.status).toBe(403)
  })

  it('should return 401 when no session exists', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null)

    const request = new Request('http://localhost:3000/api/requests/request-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'planned' })
    })

    const response = await PATCH(request, { params: { id: 'request-1' } })
    expect(response.status).toBe(403)
  })

  it('should return 400 when invalid status is provided', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession)

    const request = new Request('http://localhost:3000/api/requests/request-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'invalid-status' })
    })

    const response = await PATCH(request, { params: { id: 'request-1' } })
    expect(response.status).toBe(400)
  })

  it('should return 500 when database update fails', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession)
    mockPrisma.featureRequest.update.mockRejectedValue(new Error('Database error'))

    const request = new Request('http://localhost:3000/api/requests/request-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'planned' })
    })

    const response = await PATCH(request, { params: { id: 'request-1' } })
    expect(response.status).toBe(500)
  })
}) 