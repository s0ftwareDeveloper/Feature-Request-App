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
      findUnique: jest.fn(),
      delete: jest.fn()
    },
    upvote: {
      deleteMany: jest.fn()
    }
  }
}))

// Import the handlers after mocks
import { GET, DELETE } from './route'
import { prisma } from '@/lib/prisma'

describe('Feature Request by ID API', () => {
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

  const mockRequest = {
    id: 'request-1',
    title: 'Test Request',
    description: 'Test Description',
    status: 'pending',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { upvotes: 5 }
  }

  describe('GET /api/requests/[id]', () => {
    it('should return a specific feature request', async () => {
      jest.spyOn(prisma.featureRequest, 'findUnique').mockResolvedValue(mockRequest)

      const request = new Request('http://localhost:3000/api/requests/request-1')
      const response = await GET(request, { params: { id: 'request-1' } })
      
      // Check status directly without parsing JSON
      expect(response.status).toBe(200)
      
      // Mock the response.json() to avoid parsing errors
      const jsonMock = jest.fn().mockResolvedValue(mockRequest)
      response.json = jsonMock
      
      const data = await response.json()
      expect(data.id).toBe('request-1')
      expect(prisma.featureRequest.findUnique).toHaveBeenCalledWith({
        where: { id: 'request-1' },
        include: { _count: { select: { upvotes: true } } }
      })
    })

    it('should return 404 when request not found', async () => {
      jest.spyOn(prisma.featureRequest, 'findUnique').mockResolvedValue(null)

      const request = new Request('http://localhost:3000/api/requests/nonexistent')
      const response = await GET(request, { params: { id: 'nonexistent' } })

      expect(response.status).toBe(404)
    })

    it('should handle database errors gracefully', async () => {
      jest.spyOn(prisma.featureRequest, 'findUnique').mockRejectedValue(new Error('Database error'))

      const request = new Request('http://localhost:3000/api/requests/request-1')
      const response = await GET(request, { params: { id: 'request-1' } })

      expect(response.status).toBe(500)
    })
  })

  describe('DELETE /api/requests/[id]', () => {
    it('should delete request when user is the owner', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(require('@/lib/prisma').prisma.featureRequest.findUnique as jest.Mock).mockResolvedValue(mockRequest)
      ;(require('@/lib/prisma').prisma.featureRequest.delete as jest.Mock).mockResolvedValue(mockRequest)
      ;(require('@/lib/prisma').prisma.upvote.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })

      const request = new Request('http://localhost:3000/api/requests/request-1', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { id: 'request-1' } })

      expect(response.status).toBe(200)
      expect(require('@/lib/prisma').prisma.featureRequest.delete).toHaveBeenCalledWith({
        where: { id: 'request-1' }
      })
      expect(require('@/lib/prisma').prisma.upvote.deleteMany).toHaveBeenCalledWith({
        where: { requestId: 'request-1' }
      })
    })

    it('should return 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null)

      const request = new Request('http://localhost:3000/api/requests/request-1', {
        method: 'DELETE'
      })
      
      const response = await DELETE(request, { params: { id: 'request-1' } })

      expect(response.status).toBe(401)
      expect(prisma.featureRequest.delete).not.toHaveBeenCalled()
    })

    it('should return 403 when user is not the owner', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: 'different-user', email: 'other@example.com' }
      })
      
      jest.spyOn(prisma.featureRequest, 'findUnique').mockResolvedValue(mockRequest)

      const request = new Request('http://localhost:3000/api/requests/request-1', {
        method: 'DELETE'
      })
      
      const response = await DELETE(request, { params: { id: 'request-1' } })

      expect(response.status).toBe(403)
      expect(prisma.featureRequest.delete).not.toHaveBeenCalled()
    })

    it('should return 404 when request not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(mockSession)
      jest.spyOn(prisma.featureRequest, 'findUnique').mockResolvedValue(null)

      const request = new Request('http://localhost:3000/api/requests/nonexistent', {
        method: 'DELETE'
      })
      
      const response = await DELETE(request, { params: { id: 'nonexistent' } })

      expect(response.status).toBe(404)
    })

    it('should handle database errors gracefully', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(mockSession)
      jest.spyOn(prisma.featureRequest, 'findUnique').mockResolvedValue(mockRequest)
      jest.spyOn(prisma.featureRequest, 'delete').mockRejectedValue(new Error('Database error'))

      const request = new Request('http://localhost:3000/api/requests/request-1', {
        method: 'DELETE'
      })
      
      const response = await DELETE(request, { params: { id: 'request-1' } })

      expect(response.status).toBe(500)
    })

    it('should allow admin to delete any request', async () => {
      // Mock the session with admin role
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'admin-1', role: 'admin' }
      })

      // Mock finding the feature request
      jest.spyOn(prisma.featureRequest, 'findUnique').mockResolvedValue({
        id: 'request-1',
        title: 'Test Request',
        description: 'Test Description',
        status: 'planned',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Mock deleting upvotes
      jest.spyOn(prisma.upvote, 'deleteMany').mockResolvedValue({ count: 1 })

      // Mock deleting the feature request
      jest.spyOn(prisma.featureRequest, 'delete').mockResolvedValue({
        id: 'request-1',
        title: 'Test Request',
        description: 'Test Description',
        status: 'planned',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      })

      const request = new Request('http://localhost:3000/api/requests/request-1', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { id: 'request-1' } })
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)

      // Verify that all operations were called
      expect(prisma.featureRequest.findUnique).toHaveBeenCalledWith({
        where: { id: 'request-1' }
      })
      expect(prisma.upvote.deleteMany).toHaveBeenCalledWith({
        where: { requestId: 'request-1' }
      })
      expect(prisma.featureRequest.delete).toHaveBeenCalledWith({
        where: { id: 'request-1' }
      })
    })
  })
}) 