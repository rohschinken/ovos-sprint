import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import app from '../../index'

describe('Members API', () => {
  describe('GET /api/members', () => {
    it('returns 401 without auth token', async () => {
      const response = await request(app).get('/api/members')
      expect(response.status).toBe(401)
    })

    it('returns 401 with invalid auth token', async () => {
      const response = await request(app)
        .get('/api/members')
        .set('Authorization', 'Bearer invalid-token-12345')

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/members', () => {
    it('returns 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/members')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
        })

      expect(response.status).toBe(401)
    })

    it('returns 401 with invalid auth token', async () => {
      const response = await request(app)
        .post('/api/members')
        .set('Authorization', 'Bearer invalid-token-12345')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
        })

      expect(response.status).toBe(401)
    })
  })

  describe('PUT /api/members/:id', () => {
    it('returns 401 without auth token', async () => {
      const response = await request(app)
        .put('/api/members/1')
        .send({
          firstName: 'Updated',
          lastName: 'Name',
        })

      expect(response.status).toBe(401)
    })

    it('returns 401 with invalid auth token', async () => {
      const response = await request(app)
        .put('/api/members/1')
        .set('Authorization', 'Bearer invalid-token-12345')
        .send({
          firstName: 'Updated',
          lastName: 'Name',
        })

      expect(response.status).toBe(401)
    })
  })

  describe('DELETE /api/members/:id', () => {
    it('returns 401 without auth token', async () => {
      const response = await request(app).delete('/api/members/999')
      expect(response.status).toBe(401)
    })

    it('returns 401 with invalid auth token', async () => {
      const response = await request(app)
        .delete('/api/members/999')
        .set('Authorization', 'Bearer invalid-token-12345')

      expect(response.status).toBe(401)
    })
  })
})
