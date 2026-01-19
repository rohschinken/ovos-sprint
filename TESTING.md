# Testing Guide

## Overview

This project uses [Vitest](https://vitest.dev/) for both frontend and backend testing. Vitest is a fast, Vite-native test runner that works seamlessly with TypeScript and modern JavaScript features.

**Test Coverage:**
- Frontend: 11 tests across 3 files (UI components, utilities, React components)
- Backend: 10 tests across 3 files (health check, authentication, API routes)
- Total: 21 tests, all passing

## Running Tests

### Frontend Tests

```bash
cd frontend
npm test              # Watch mode - reruns tests on file changes
npm run test:ui       # Visual UI - opens browser with interactive test viewer
npm run test:run      # Run once - runs all tests once and exits
npm run test:coverage # With coverage - generates coverage report
```

**Frontend Test Stack:**
- Vitest (test runner)
- @testing-library/react (component testing)
- @testing-library/jest-dom (DOM matchers)
- @testing-library/user-event (user interaction simulation)
- jsdom (DOM environment for Node.js)

### Backend Tests

```bash
cd backend
npm test              # Watch mode - reruns tests on file changes
npm run test:ui       # Visual UI - opens browser with interactive test viewer
npm run test:run      # Run once - runs all tests once and exits
npm run test:coverage # With coverage - generates coverage report
```

**Backend Test Stack:**
- Vitest (test runner)
- supertest (HTTP assertions for Express)
- In-memory SQLite database for test isolation

### All Tests (from Project Root)

```bash
# Run tests once (non-interactive, for CI/CD)
npm test                        # Sequential - runs frontend then backend once
npm run test:frontend           # Frontend only (non-interactive)
npm run test:backend            # Backend only (non-interactive)
npm run test:all                # Parallel - runs both concurrently (faster)

# Watch mode (interactive, for development)
npm run test:watch              # Watch both frontend and backend
npm run test:watch:frontend     # Watch frontend only
npm run test:watch:backend      # Watch backend only

# Coverage reports
npm run test:coverage           # Coverage for both
npm run test:coverage:frontend  # Frontend coverage only
npm run test:coverage:backend   # Backend coverage only
```

## Writing Tests

### Frontend Component Tests

**Location:** `frontend/src/**/tests/*.test.tsx`

Use the custom render function from `@/tests/utils` which provides all necessary providers (React Query, React Router, Tooltip):

```typescript
import { render, screen, userEvent } from '@/tests/utils'
import { MyComponent } from '../MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('handles user interaction', async () => {
    const user = userEvent.setup()
    render(<MyComponent />)

    const button = screen.getByRole('button', { name: /click me/i })
    await user.click(button)

    expect(screen.getByText('Clicked!')).toBeInTheDocument()
  })
})
```

**Available Matchers (from @testing-library/jest-dom):**
- `toBeInTheDocument()` - Element exists in DOM
- `toHaveClass()` - Element has CSS class
- `toHaveTextContent()` - Element contains text
- `toBeDisabled()` - Element is disabled
- `toBeVisible()` - Element is visible
- And many more...

### Frontend Utility Tests

**Location:** `frontend/src/lib/tests/*.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { myUtilFunction } from '../utils'

describe('myUtilFunction', () => {
  it('does what it should do', () => {
    const result = myUtilFunction('input')
    expect(result).toBe('expected output')
  })
})
```

### Backend API Tests

**Location:** `backend/src/routes/tests/*.test.ts`

Use supertest for HTTP assertions:

```typescript
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../index'

describe('API Endpoint', () => {
  it('returns 200 for valid request', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .send({ data: 'test' })

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('result')
  })

  it('returns 401 without auth token', async () => {
    const response = await request(app).get('/api/protected')
    expect(response.status).toBe(401)
  })
})
```

**For Authenticated Requests:**

```typescript
import { getAuthToken, authenticatedRequest } from '../../tests/utils'

describe('Protected API', () => {
  let authToken: string

  beforeAll(async () => {
    authToken = await getAuthToken(app)
  })

  it('allows authenticated access', async () => {
    const response = await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${authToken}`)

    expect(response.status).toBe(200)
  })
})
```

## Test Organization

### Directory Structure

```
frontend/
  src/
    components/
      ui/
        tests/
          button.test.tsx
      timeline/
        tests/
          DayOffIndicator.test.tsx
    lib/
      tests/
        utils.test.ts
    tests/
      setup.ts        # Global test setup
      utils.tsx       # Custom render with providers

backend/
  src/
    routes/
      tests/
        auth.test.ts
        health.test.ts
        projects.test.ts
    tests/
      setup.ts        # Global test setup
      utils.ts        # Auth helpers, mock data
```

### File Naming Conventions

- Test files: `*.test.ts` or `*.test.tsx`
- Test directory: `tests/` (sibling to source files)
- Setup files: `src/tests/setup.ts`
- Utility files: `src/tests/utils.ts` or `utils.tsx`

### Test Structure

Use descriptive `describe` blocks and clear test names:

```typescript
describe('ComponentName', () => {
  describe('when condition A', () => {
    it('does behavior X', () => {
      // Arrange: Set up test data and conditions
      const input = 'test'

      // Act: Execute the code being tested
      const result = myFunction(input)

      // Assert: Verify the expected outcome
      expect(result).toBe('expected')
    })
  })
})
```

## Coverage Reports

Coverage reports are generated in the `coverage/` directory of each package:

- Frontend: [frontend/coverage/index.html](frontend/coverage/index.html)
- Backend: [backend/coverage/index.html](backend/coverage/index.html)

Open these HTML files in a browser to see detailed line-by-line coverage.

**Coverage Exclusions:**
- `node_modules/`
- Test files themselves (`src/tests/`)
- TypeScript declaration files (`**/*.d.ts`)
- Config files (`**/*.config.*`)
- Database migrations (`src/db/migrations/`)
- Mock data directories

## Continuous Integration

To run tests in CI/CD pipelines:

```bash
# Install dependencies
npm run install:all

# Run all tests once (no watch mode)
npm test

# Or with coverage
npm run test:coverage
```

Tests run in CI mode automatically when `CI=true` environment variable is set (most CI services set this automatically).

## Troubleshooting

### Tests Pass Locally But Fail in CI

- Check for timezone differences (use UTC in tests)
- Ensure NODE_ENV is set to 'test'
- Check for timing issues (use `waitFor` for async operations)

### "Cannot find module" Errors

- Verify path aliases are configured in both `tsconfig.json` and `vitest.config.ts`
- Check that imports use `@/` prefix correctly

### Port Already in Use (Backend Tests)

- The backend server is configured to NOT start in test mode (`NODE_ENV=test`)
- If you see EADDRINUSE errors, check that `process.env.NODE_ENV` is set to 'test' in test setup

### Test Timeouts

- Default timeout is 5 seconds
- Increase timeout for slow operations:
  ```typescript
  it('slow operation', async () => {
    // Test code
  }, 10000) // 10 second timeout
  ```

## Best Practices

### DO:
- ✅ Test user-facing behavior, not implementation details
- ✅ Use descriptive test names that explain what is being tested
- ✅ Keep tests focused and isolated (one concept per test)
- ✅ Use `screen.getByRole()` for accessibility-focused queries
- ✅ Test error cases and edge cases
- ✅ Clean up after tests (handled automatically by test setup)

### DON'T:
- ❌ Test internal implementation details (private methods, state)
- ❌ Make tests dependent on each other
- ❌ Use hardcoded delays (`setTimeout`) - use `waitFor` instead
- ❌ Test third-party libraries (trust they work)
- ❌ Over-mock - only mock external dependencies

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [Testing Library React](https://testing-library.com/docs/react-testing-library/intro/)
- [supertest Documentation](https://github.com/ladjs/supertest)
- [jest-dom Matchers](https://github.com/testing-library/jest-dom)

## Next Steps

As you add new features:

1. Write tests for new components and functions
2. Run tests in watch mode during development
3. Check coverage to identify untested code
4. Run full test suite before committing
5. Keep test coverage above 80% (target)

Happy testing! 🧪
