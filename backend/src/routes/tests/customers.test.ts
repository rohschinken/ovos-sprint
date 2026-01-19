import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../index'

describe('Customers API', () => {
  describe('GET /api/customers', () => {
    it('returns 401 without auth token', async () => {
      const response = await request(app).get('/api/customers')
      expect(response.status).toBe(401)
    })

    it('returns 401 with invalid auth token', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', 'Bearer invalid-token-12345')

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/customers', () => {
    it('returns 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/customers')
        .send({
          name: 'Test Customer',
          email: 'customer@example.com',
        })

      expect(response.status).toBe(401)
    })

    it('returns 401 with invalid auth token', async () => {
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', 'Bearer invalid-token-12345')
        .send({
          name: 'Test Customer',
          email: 'customer@example.com',
        })

      expect(response.status).toBe(401)
    })
  })

  describe('PUT /api/customers/:id', () => {
    it('returns 401 without auth token', async () => {
      const response = await request(app)
        .put('/api/customers/1')
        .send({
          name: 'Updated Customer',
        })

      expect(response.status).toBe(401)
    })

    it('returns 401 with invalid auth token', async () => {
      const response = await request(app)
        .put('/api/customers/1')
        .set('Authorization', 'Bearer invalid-token-12345')
        .send({
          name: 'Updated Customer',
        })

      expect(response.status).toBe(401)
    })
  })

  describe('DELETE /api/customers/:id', () => {
    it('returns 401 without auth token', async () => {
      const response = await request(app).delete('/api/customers/999')
      expect(response.status).toBe(401)
    })

    it('returns 401 with invalid auth token', async () => {
      const response = await request(app)
        .delete('/api/customers/999')
        .set('Authorization', 'Bearer invalid-token-12345')

      expect(response.status).toBe(401)
    })
  })
})
