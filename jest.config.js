const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-node',
  moduleNameMapper: {
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/lib/(.*)$': '<rootDir>/app/lib/$1',
    '^@/(.*)$': '<rootDir>/app/$1'
  },
  moduleDirectories: ['node_modules', '<rootDir>'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  collectCoverage: true,
  collectCoverageFrom: [
    'app/api/requests/[id]/status/route.ts',
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