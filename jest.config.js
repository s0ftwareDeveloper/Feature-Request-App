const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  testEnvironment: 'jest-environment-node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^../../../app/api/auth/\\[\\.\\.\\.nextauth\\]/route$': '<rootDir>/__mocks__/auth/[...nextauth]/route.ts',
    '^../../app/api/auth/\\[\\.\\.\\.nextauth\\]/route$': '<rootDir>/__mocks__/auth/[...nextauth]/route.ts',
    '^../../../app/api/auth/\\[\\.\\.\\.nextauth\\]/options$': '<rootDir>/__mocks__/auth/[...nextauth]/options.ts',
    '^../../app/api/auth/\\[\\.\\.\\.nextauth\\]/options$': '<rootDir>/__mocks__/auth/[...nextauth]/options.ts'
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'app/api/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__mocks__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
}

module.exports = createJestConfig(customJestConfig) 