import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { POST } from './route'

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn()
}))

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should clear the token cookie and return success message', async () => {
    // Mock cookie deletion
    const mockDelete = jest.fn()
    ;(cookies as jest.Mock).mockReturnValue({ delete: mockDelete })

    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Logged out successfully')
    expect(mockDelete).toHaveBeenCalledWith('token')
  })

  it('should handle errors gracefully', async () => {
    // Mock cookie deletion to throw an error
    const mockDelete = jest.fn().mockImplementation(() => {
      throw new Error('Cookie deletion failed')
    })
    ;(cookies as jest.Mock).mockReturnValue({ delete: mockDelete })

    const response = await POST()
    expect(response.status).toBe(500)
    expect(await response.text()).toBe('Internal server error')
    expect(mockDelete).toHaveBeenCalledWith('token')
  })
}) 