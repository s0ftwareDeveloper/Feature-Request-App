import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { PrismaClient } from '@prisma/client'

// Mock NextAuth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}))

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    featureRequest: {
      update: jest.fn()
    }
  }
}))

// Mock authOptions
jest.mock('../../../auth/[...nextauth]/options', () => ({
  authOptions: {}
}))

// Import the handler and prisma after mocks
import { PATCH } from './route'
import { prisma } from '@/lib/prisma'

describe('PATCH /api/requests/[id]/status', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockSession = {
    user: {
      id: 'user-1',
      email: 'admin@example.com',
      role: 'admin'
    }
  }

  const mockResponse = {
    id: 'request-1',
    title: 'Test Request',
    description: 'Test Description',
    status: 'planned',
    userId: 'user-1',
    createdAt: new Date('2023-01-01T00:00:00.000Z'),
    updatedAt: new Date('2023-01-01T00:00:00.000Z')
  }

  it('should update status when admin makes valid request', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession)
    
    // Use the mocked prisma client directly
    jest.spyOn(prisma.featureRequest, 'update').mockResolvedValue(mockResponse)

    const request = new Request('http://localhost:3000/api/requests/request-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'planned' })
    })

    const response = await PATCH(request, { params: { id: 'request-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('planned')
    expect(prisma.featureRequest.update).toHaveBeenCalledWith({
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
    const data = await response.json()
    expect(data.error).toBe('Admin access required')
  })

  it('should return 401 when no session exists', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null)

    const request = new Request('http://localhost:3000/api/requests/request-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'planned' })
    })

    const response = await PATCH(request, { params: { id: 'request-1' } })
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 400 when invalid status is provided', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession)

    const request = new Request('http://localhost:3000/api/requests/request-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'invalid-status' })
    })

    const response = await PATCH(request, { params: { id: 'request-1' } })
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Invalid status')
  })

  it('should return 400 when request body is missing status', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession)

    const request = new Request('http://localhost:3000/api/requests/request-1/status', {
      method: 'PATCH',
      body: JSON.stringify({})
    })

    const response = await PATCH(request, { params: { id: 'request-1' } })
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Status is required')
  })

  it('should return 400 when request body is malformed JSON', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession)

    const request = new Request('http://localhost:3000/api/requests/request-1/status', {
      method: 'PATCH',
      body: 'invalid-json{'
    })

    const response = await PATCH(request, { params: { id: 'request-1' } })
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Invalid request body')
  })

  it('should return 404 when feature request does not exist', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession)
    jest.spyOn(prisma.featureRequest, 'update').mockRejectedValue({ code: 'P2025' })

    const request = new Request('http://localhost:3000/api/requests/nonexistent-id/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'planned' })
    })

    const response = await PATCH(request, { params: { id: 'nonexistent-id' } })
    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe('Feature request not found')
  })

  it('should return 500 when database update fails', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(mockSession)
    jest.spyOn(prisma.featureRequest, 'update').mockRejectedValue(new Error('Database error'))

    const request = new Request('http://localhost:3000/api/requests/request-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'planned' })
    })

    const response = await PATCH(request, { params: { id: 'request-1' } })
    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Internal server error')
  })
}) 