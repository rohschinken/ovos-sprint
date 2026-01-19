import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../index'

describe('Projects API', () => {
  describe('GET /api/projects', () => {
    it('returns 401 without auth token', async () => {
      const response = await request(app).get('/api/projects')
      expect(response.status).toBe(401)
    })

    it('returns 401 with invalid auth token', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', 'Bearer invalid-token-12345')

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/projects', () => {
    it('returns 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({
          name: 'Test Project',
          customerId: 1,
          status: 'confirmed',
        })

      expect(response.status).toBe(401)
    })

    it('returns 401 with invalid auth token', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer invalid-token-12345')
        .send({
          name: 'Test Project',
          customerId: 1,
          status: 'confirmed',
        })

      expect(response.status).toBe(401)
    })
  })
})
