import { afterAll, beforeAll } from 'vitest'

// Setup runs before all tests
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test'

  // Use in-memory database for tests
  process.env.DATABASE_URL = ':memory:'

  console.log('Test environment initialized')
})

// Cleanup after all tests
afterAll(() => {
  console.log('Test environment cleaned up')
})
