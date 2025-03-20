import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyJWT } from '@/lib/jwt'
import { POST, DELETE } from './route'

// Mock dependencies
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}))

jest.mock('@/lib/jwt', () => ({
  verifyJWT: jest.fn()
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    featureRequest: {
      findUnique: jest.fn()
    },
    upvote: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn()
    }
  }
}))

describe('Upvote API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockToken = 'mock-jwt-token'
  const mockPayload = {
    id: 'user-1',
    email: 'test@example.com',
    role: 'user'
  }

  const mockFeatureRequest = {
    id: 'request-1',
    title: 'Test Request',
    description: 'Test Description',
    status: 'pending',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockUpvote = {
    id: 'upvote-1',
    userId: 'user-1',
    requestId: 'request-1',
    createdAt: new Date('2025-03-20T17:11:10.495Z').toISOString()
  }

  describe('POST /api/upvote/[id]', () => {
    it('should create an upvote successfully', async () => {
      // Mock cookie and JWT verification
      ;(cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: mockToken })
      })
      ;(verifyJWT as jest.Mock).mockResolvedValue(mockPayload)
      // Mock feature request lookup
      ;(require('@/lib/prisma').prisma.featureRequest.findUnique as jest.Mock).mockResolvedValue(mockFeatureRequest)
      // Mock upvote creation
      ;(require('@/lib/prisma').prisma.upvote.create as jest.Mock).mockResolvedValue(mockUpvote)

      const request = new Request('http://localhost:3000/api/upvote/request-1', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: 'request-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockUpvote)
      expect(require('@/lib/prisma').prisma.upvote.create).toHaveBeenCalledWith({
        data: {
          userId: mockPayload.id,
          requestId: 'request-1'
        }
      })
    })

    it('should return 401 when not authenticated', async () => {
      ;(cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue(undefined)
      })

      const request = new Request('http://localhost:3000/api/upvote/request-1', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: 'request-1' } })
      expect(response.status).toBe(401)
      expect(await response.text()).toBe('Unauthorized')
    })

    it('should return 404 when feature request not found', async () => {
      ;(cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: mockToken })
      })
      ;(verifyJWT as jest.Mock).mockResolvedValue(mockPayload)
      ;(require('@/lib/prisma').prisma.featureRequest.findUnique as jest.Mock).mockResolvedValue(null)

      const request = new Request('http://localhost:3000/api/upvote/request-1', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: 'request-1' } })
      expect(response.status).toBe(404)
      expect(await response.text()).toBe('Feature request not found')
    })

    it('should return 400 when user has already upvoted', async () => {
      ;(cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: mockToken })
      })
      ;(verifyJWT as jest.Mock).mockResolvedValue(mockPayload)
      ;(require('@/lib/prisma').prisma.featureRequest.findUnique as jest.Mock).mockResolvedValue(mockFeatureRequest)
      ;(require('@/lib/prisma').prisma.upvote.create as jest.Mock).mockRejectedValue({ code: 'P2002' })

      const request = new Request('http://localhost:3000/api/upvote/request-1', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: 'request-1' } })
      expect(response.status).toBe(400)
      expect(await response.text()).toBe('You have already upvoted this request')
    })
  })

  describe('DELETE /api/upvote/[id]', () => {
    it('should delete an upvote successfully', async () => {
      ;(cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: mockToken })
      })
      ;(verifyJWT as jest.Mock).mockResolvedValue(mockPayload)
      ;(require('@/lib/prisma').prisma.upvote.findUnique as jest.Mock).mockResolvedValue(mockUpvote)
      ;(require('@/lib/prisma').prisma.upvote.delete as jest.Mock).mockResolvedValue(mockUpvote)

      const request = new Request('http://localhost:3000/api/upvote/request-1', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { id: 'request-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })
      expect(require('@/lib/prisma').prisma.upvote.delete).toHaveBeenCalledWith({
        where: {
          userId_requestId: {
            userId: mockPayload.id,
            requestId: 'request-1'
          }
        }
      })
    })

    it('should return success when upvote already removed', async () => {
      ;(cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ value: mockToken })
      })
      ;(verifyJWT as jest.Mock).mockResolvedValue(mockPayload)
      ;(require('@/lib/prisma').prisma.upvote.findUnique as jest.Mock).mockResolvedValue(null)

      const request = new Request('http://localhost:3000/api/upvote/request-1', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { id: 'request-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true, message: 'Upvote already removed' })
    })

    it('should return 401 when not authenticated', async () => {
      ;(cookies as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue(undefined)
      })

      const request = new Request('http://localhost:3000/api/upvote/request-1', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: { id: 'request-1' } })
      expect(response.status).toBe(401)
      expect(await response.text()).toBe('Unauthorized')
    })
  })
}) 