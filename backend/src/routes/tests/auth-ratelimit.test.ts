/**
 * Tests for rate limiting on login and registration endpoints.
 *
 * Verifies that POST /api/auth/login and POST /api/auth/register
 * return 429 after exceeding the allowed number of requests.
 *
 * Note: The rate limiter is IP-based and the in-memory store persists across
 * test files (which run serially). We send enough requests to guarantee the
 * limit is exceeded even if earlier test files consumed some of the budget.
 *
 * Since login and register share the same IP-based rate limit key (route
 * scoping is a separate TODO), we test them independently by checking that
 * each endpoint is capable of returning 429 when overloaded.
 */
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../index.js'

describe('Auth rate limiting', () => {
  it('POST /api/auth/login returns 429 after exceeding rate limit', async () => {
    // Send 15 requests to guarantee we exceed the 10-request limit,
    // even if prior test files consumed some of the rate limit budget
    // from the same IP.
    let got429 = false
    for (let i = 0; i < 15; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: `ratelimit-login-${i}@example.com`,
          password: 'wrongpassword',
        })

      if (res.status === 429) {
        got429 = true
        expect(res.body).toHaveProperty('error', 'Too many requests')
        break
      }
    }

    expect(got429).toBe(true)
  })

  it('POST /api/auth/register returns 429 after exceeding rate limit', async () => {
    // After the login test above, the IP may already be rate limited.
    // Either way, register must also enforce rate limiting and return 429.
    let got429 = false
    for (let i = 0; i < 15; i++) {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: `ratelimit-register-${i}@example.com`,
          password: 'SomePassword123!',
          token: 'invalid-token',
        })

      if (res.status === 429) {
        got429 = true
        expect(res.body).toHaveProperty('error', 'Too many requests')
        break
      }
    }

    expect(got429).toBe(true)
  })
})
