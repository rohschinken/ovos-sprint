import { afterAll, beforeAll } from 'vitest'

// Setup runs before all tests
beforeAll(() => {
  console.log('Test environment initialized')
  console.log('Using test database:', process.env.DATABASE_URL)

  // Verify test database is configured
  if (!process.env.DATABASE_URL?.includes('test')) {
    throw new Error('CRITICAL: Tests must use a test database! Current DATABASE_URL: ' + process.env.DATABASE_URL)
  }
})

// Cleanup after all tests
afterAll(() => {
  console.log('Test environment cleaned up')

  // Note: We don't manually delete the test database file here because:
  // 1. The database connection may still be open (causes EBUSY errors)
  // 2. Keeping the test database helps with debugging test failures
  // 3. The test database is in .gitignore so it won't be committed
  // If you need to clean up manually, run: rm backend/data/test-ovos-sprint.db*
})
