import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../index'
import { mockUser } from '../../tests/utils'

describe('Auth API', () => {
  describe('POST /api/auth/login', () => {
    it('returns 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'somepassword',
        })

      expect(response.status).toBe(400)
    })

    it('returns 400 for missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
        })

      expect(response.status).toBe(400)
    })

    it('returns 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})

      expect(response.status).toBe(400)
    })

    it('returns 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        })

      expect(response.status).toBe(401)
    })
  })
})
