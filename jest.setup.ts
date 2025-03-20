import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}))

// Mock Next Auth
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
}))

// Mock Next Auth route globally
jest.mock('../../../app/api/auth/[...nextauth]/route', () => ({
  GET: jest.fn(),
  POST: jest.fn()
}), { virtual: true })

jest.mock('../../app/api/auth/[...nextauth]/route', () => ({
  GET: jest.fn(),
  POST: jest.fn()
}), { virtual: true })

beforeEach(() => {
  mockReset(prismaMock)
  jest.clearAllMocks()
})

export const prismaMock = mockDeep<PrismaClient>() 