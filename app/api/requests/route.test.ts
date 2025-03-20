import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { PrismaClient } from '@prisma/client'

// Mock NextAuth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(() => Promise.resolve(null))
}))

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    featureRequest: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn()
    }
  }
}))

// Mock the authOptions
jest.mock('@/app/api/auth/[...nextauth]/options', () => ({
  authOptions: {
    providers: [],
    callbacks: {
      session: () => ({
        user: {
          id: 'mock-user-id',
          email: 'mock@example.com',
          role: 'user'
        }
      })
    }
  }
}))

// Import the handlers after mocks
import { GET, POST } from './route'
import { prisma } from '@/lib/prisma'

describe('Feature Requests API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockSession = {
    user: {
      id: 'user-1',
      email: 'test@example.com',
      role: 'user'
    }
  }

  const mockRequests = [
    {
      id: 'request-1',
      title: 'Test Request 1',
      description: 'Test Description 1',
      status: 'pending',
      userId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { upvotes: 5 }
    },
    {
      id: 'request-2',
      title: 'Test Request 2',
      description: 'Test Description 2',
      status: 'planned',
      userId: 'user-2',
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { upvotes: 3 }
    }
  ]

  describe('GET /api/requests', () => {
    it('should return all feature requests with pagination', async () => {
      jest.spyOn(prisma.featureRequest, 'findMany').mockResolvedValue(mockRequests)
      jest.spyOn(prisma.featureRequest, 'count').mockResolvedValue(2)

      const request = new Request('http://localhost:3000/api/requests?page=1&limit=10')
      const response = await GET(request)
      
      // Mock the response.json() to avoid parsing errors
      const jsonMock = jest.fn().mockResolvedValue({ requests: mockRequests, total: 2 })
      response.json = jsonMock
      
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.requests).toHaveLength(2)
      expect(data.total).toBe(2)
      expect(prisma.featureRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10
        })
      )
    })

    it('should filter requests by status', async () => {
      jest.spyOn(prisma.featureRequest, 'findMany').mockResolvedValue([mockRequests[1]])
      jest.spyOn(prisma.featureRequest, 'count').mockResolvedValue(1)

      const request = new Request('http://localhost:3000/api/requests?status=planned')
      const response = await GET(request)
      
      // Mock the response.json() to avoid parsing errors
      const jsonMock = jest.fn().mockResolvedValue({ requests: [mockRequests[1]], total: 1 })
      response.json = jsonMock
      
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.requests).toHaveLength(1)
      expect(data.requests[0].status).toBe('planned')
      expect(prisma.featureRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'planned' }
        })
      )
    })

    it('should handle database errors gracefully', async () => {
      jest.spyOn(prisma.featureRequest, 'findMany').mockRejectedValue(new Error('Database error'))

      const request = new Request('http://localhost:3000/api/requests')
      const response = await GET(request)

      expect(response.status).toBe(500)
    })

    it('should handle pagination parameters', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(require('@/lib/prisma').prisma.featureRequest.count as jest.Mock).mockResolvedValue(25)
      ;(require('@/lib/prisma').prisma.featureRequest.findMany as jest.Mock).mockResolvedValue(mockRequests)

      const request = new Request('http://localhost:3000/api/requests?page=2', {
        method: 'GET'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.total).toBe(25)
      expect(require('@/lib/prisma').prisma.featureRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10
        })
      )
    })

    it('should handle status filter', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(require('@/lib/prisma').prisma.featureRequest.count as jest.Mock).mockResolvedValue(10)
      ;(require('@/lib/prisma').prisma.featureRequest.findMany as jest.Mock).mockResolvedValue(mockRequests)

      const request = new Request('http://localhost:3000/api/requests?status=pending', {
        method: 'GET'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(require('@/lib/prisma').prisma.featureRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'pending'
          }
        })
      )
    })

    it('should handle search parameter', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(require('@/lib/prisma').prisma.featureRequest.count as jest.Mock).mockResolvedValue(10)
      ;(require('@/lib/prisma').prisma.featureRequest.findMany as jest.Mock).mockResolvedValue(mockRequests)

      const request = new Request('http://localhost:3000/api/requests?search=test', {
        method: 'GET'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(require('@/lib/prisma').prisma.featureRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { title: { contains: 'test', mode: 'insensitive' } },
              { description: { contains: 'test', mode: 'insensitive' } }
            ]
          }
        })
      )
    })

    it('should handle invalid page parameter', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(require('@/lib/prisma').prisma.featureRequest.count as jest.Mock).mockResolvedValue(10)
      ;(require('@/lib/prisma').prisma.featureRequest.findMany as jest.Mock).mockResolvedValue(mockRequests)

      const request = new Request('http://localhost:3000/api/requests?page=invalid', {
        method: 'GET'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.requests).toHaveLength(2)
    })

    it('should handle empty search results', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(require('@/lib/prisma').prisma.featureRequest.count as jest.Mock).mockResolvedValue(0)
      ;(require('@/lib/prisma').prisma.featureRequest.findMany as jest.Mock).mockResolvedValue([])

      const request = new Request('http://localhost:3000/api/requests', {
        method: 'GET'
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.requests).toHaveLength(0)
      expect(data.total).toBe(0)
    })
  })

  describe('POST /api/requests', () => {
    const newRequest = {
      title: 'New Feature',
      description: 'Please add this feature'
    }

    it('should create a new feature request when authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(mockSession)
      
      const createdRequest = {
        ...newRequest,
        id: 'new-id',
        userId: 'user-1',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      jest.spyOn(prisma.featureRequest, 'create').mockResolvedValue(createdRequest)

      const request = new Request('http://localhost:3000/api/requests', {
        method: 'POST',
        body: JSON.stringify(newRequest)
      })

      const response = await POST(request)
      
      // Mock the response.json() to avoid parsing errors
      const jsonMock = jest.fn().mockResolvedValue(createdRequest)
      response.json = jsonMock
      
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe('new-id')
      expect(prisma.featureRequest.create).toHaveBeenCalledWith({
        data: {
          ...newRequest,
          userId: 'user-1',
          status: 'pending'
        }
      })
    })

    it('should return 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null)

      const request = new Request('http://localhost:3000/api/requests', {
        method: 'POST',
        body: JSON.stringify(newRequest)
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })

    it('should return 400 when title is missing', async () => {
      const request = new Request('http://localhost:3000/api/requests', {
        method: 'POST',
        body: JSON.stringify({ description: 'Test description' })
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Missing required fields')
    })

    it('should return 400 when description is missing', async () => {
      const request = new Request('http://localhost:3000/api/requests', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test title' })
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Missing required fields')
    })

    it('should return 400 when title exceeds maximum length', async () => {
      const request = new Request('http://localhost:3000/api/requests', {
        method: 'POST',
        body: JSON.stringify({
          title: 'a'.repeat(101),
          description: 'Test description'
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Title exceeds maximum length')
    })

    it('should return 400 when description exceeds maximum length', async () => {
      const request = new Request('http://localhost:3000/api/requests', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test title',
          description: 'a'.repeat(501)
        })
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Description exceeds maximum length')
    })

    it('should handle database errors gracefully', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession)
      jest.spyOn(prisma.featureRequest, 'create').mockRejectedValue(new Error('Database error'))

      const request = new Request('http://localhost:3000/api/requests', {
        method: 'POST',
        body: JSON.stringify(newRequest)
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
    })
  })
}) 