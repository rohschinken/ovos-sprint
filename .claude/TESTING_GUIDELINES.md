# Testing Guidelines for OVOS Sprint

## Core Testing Principles

### ALWAYS Write Tests When:

1. **Adding New Features**
   - Write tests BEFORE or DURING implementation (TDD approach preferred)
   - Test all user-facing functionality
   - Test edge cases and error conditions
   - Test different user roles and permissions
   - Ensure tests cover the feature's acceptance criteria

2. **Changing Existing Features**
   - Update existing tests to reflect new behavior
   - Add new tests for new edge cases introduced by the change
   - Verify old tests still pass (or update them appropriately)
   - Test backward compatibility if applicable

3. **Fixing Bugs**
   - ALWAYS add a regression test that reproduces the bug
   - Verify the test fails before the fix
   - Verify the test passes after the fix
   - Document the bug and fix in the test description

### Test Coverage Requirements

- **Minimum Coverage**: 80% line coverage (target)
- **Critical Paths**: 100% coverage for authentication, authorization, data mutations
- **User Roles**: Test all features with different user roles (admin, user, etc.)
- **Error Cases**: Test all error scenarios (validation errors, 401, 403, 404, 500)

## Testing Patterns

### Frontend Tests

**Component Tests:**
```typescript
// Test user-facing behavior, not implementation details
describe('ComponentName', () => {
  it('renders correctly with required props', () => {
    render(<ComponentName prop="value" />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('handles user interaction', async () => {
    const user = userEvent.setup()
    render(<ComponentName onAction={mockFn} />)
    await user.click(screen.getByRole('button'))
    expect(mockFn).toHaveBeenCalled()
  })

  it('shows error state when data fails to load', () => {
    // Test error cases
  })
})
```

**State Management Tests:**
- Test Zustand store actions and state updates
- Test React Query hooks (loading, success, error states)

**Accessibility Tests:**
- Use `getByRole` queries (better than `getByTestId`)
- Verify keyboard navigation works
- Check ARIA labels and descriptions

### Backend Tests

**API Endpoint Tests:**
```typescript
describe('POST /api/endpoint', () => {
  it('returns 200 for valid request', async () => {
    const response = await request(app)
      .post('/api/endpoint')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validData)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject(expectedShape)
  })

  it('returns 401 without auth token', async () => {
    const response = await request(app).post('/api/endpoint')
    expect(response.status).toBe(401)
  })

  it('returns 403 for insufficient permissions', async () => {
    const response = await request(app)
      .post('/api/endpoint')
      .set('Authorization', `Bearer ${userToken}`)
      .send(validData)

    expect(response.status).toBe(403)
  })

  it('returns 400 for invalid data', async () => {
    const response = await request(app)
      .post('/api/endpoint')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(invalidData)

    expect(response.status).toBe(400)
    expect(response.body.error).toBeDefined()
  })
})
```

**Authorization Tests:**
- Test admin-only endpoints with admin token (200) and user token (403)
- Test user endpoints with valid token (200) and no token (401)
- Test resource ownership (users can only modify their own resources)

**Data Validation Tests:**
- Test Zod schema validation
- Test required fields
- Test field format validation (email, URL, etc.)
- Test min/max lengths and values

## User Roles and Permissions

### Role Hierarchy:
- **Admin**: Full access to all resources
- **User**: Limited access, can only modify own resources

### Test Matrix:
For each protected endpoint, test:
- ✅ Admin can access (200/201)
- ✅ User can access own resources (200/201)
- ❌ User cannot access others' resources (403)
- ❌ Unauthenticated cannot access (401)

## Regression Testing

### When a Bug is Fixed:
1. Create a test file or add to existing: `src/**/tests/regressions.test.ts`
2. Name test with bug reference: `it('fixes timeline team filtering bug', ...)`
3. Add comment with bug details and date fixed
4. Verify test fails before fix, passes after

### Document in Test:
```typescript
describe('Regression Tests', () => {
  // Bug fixed: 2026-01-15
  // Issue: Timeline team filtering was not working correctly
  it('filters timeline by selected team', async () => {
    // Test implementation
  })
})
```

## Test Organization

### File Structure:
```
src/
  components/
    timeline/
      Timeline.tsx
      tests/
        Timeline.test.tsx          # Component tests
        TimelineHeader.test.tsx
        regressions.test.tsx       # Bug regression tests
  routes/
    projects.ts
    tests/
      projects.test.ts             # API tests
      projects-permissions.test.ts # Authorization tests
```

### Test Naming:
- Files: `ComponentName.test.tsx` or `route-name.test.ts`
- Describe blocks: Match the component/function name
- Test names: Describe behavior in plain English

## Running Tests

### During Development:
```bash
npm test                    # Watch mode (preferred during development)
npm run test:ui            # Visual UI for debugging
```

### Before Committing:
```bash
npm run test:run           # Run all tests once
npm run test:coverage      # Check coverage
```

### CI/CD:
```bash
npm test                   # Runs all tests in CI mode
```

## Coverage Reports

- View: `coverage/index.html` (frontend and backend)
- Target: 80% line coverage minimum
- Focus on: Critical paths, user flows, business logic

## Best Practices

### DO:
- ✅ Write tests for all new features
- ✅ Update tests when changing features
- ✅ Add regression tests for all bug fixes
- ✅ Test different user roles and permissions
- ✅ Test error cases and edge cases
- ✅ Use descriptive test names
- ✅ Keep tests focused (one concept per test)
- ✅ Use `screen.getByRole()` for accessibility
- ✅ Test user behavior, not implementation

### DON'T:
- ❌ Skip tests because of time pressure
- ❌ Test implementation details
- ❌ Make tests dependent on each other
- ❌ Use hardcoded delays (`setTimeout`)
- ❌ Commit failing tests
- ❌ Ignore low test coverage warnings

## Useful Test Patterns

### Testing Forms:
```typescript
it('submits form with valid data', async () => {
  const user = userEvent.setup()
  render(<Form onSubmit={mockSubmit} />)

  await user.type(screen.getByLabelText(/name/i), 'John Doe')
  await user.type(screen.getByLabelText(/email/i), 'john@example.com')
  await user.click(screen.getByRole('button', { name: /submit/i }))

  expect(mockSubmit).toHaveBeenCalledWith({
    name: 'John Doe',
    email: 'john@example.com'
  })
})
```

### Testing Async Operations:
```typescript
it('shows loading state then data', async () => {
  render(<AsyncComponent />)

  expect(screen.getByText(/loading/i)).toBeInTheDocument()

  await waitFor(() => {
    expect(screen.getByText(/data loaded/i)).toBeInTheDocument()
  })
})
```

### Testing WebSocket Updates:
```typescript
it('updates UI when WebSocket message received', async () => {
  render(<RealtimeComponent />)

  // Trigger WebSocket event
  act(() => {
    mockSocket.emit('update', newData)
  })

  await waitFor(() => {
    expect(screen.getByText(newData.text)).toBeInTheDocument()
  })
})
```

## When Tests Fail

1. **Read the error message carefully**
2. **Check if the test is correct** (not the code)
3. **Run test in isolation** to eliminate side effects
4. **Use test:ui mode** for debugging
5. **Add console.logs** or use debugger
6. **Check test setup** (providers, mocks, etc.)

## Continuous Improvement

- Review test coverage weekly
- Identify untested code paths
- Add tests for frequently broken features
- Refactor tests when they become hard to maintain
- Share testing patterns with team

---

Remember: **Tests are documentation.** They show how the code should be used and what behavior is expected. Write tests that future developers (including yourself) will thank you for.
