import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../index'

describe('Teams API', () => {
  describe('GET /api/teams', () => {
    it('returns 401 without auth token', async () => {
      const response = await request(app).get('/api/teams')
      expect(response.status).toBe(401)
    })

    it('returns 401 with invalid auth token', async () => {
      const response = await request(app)
        .get('/api/teams')
        .set('Authorization', 'Bearer invalid-token-12345')

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/teams', () => {
    it('returns 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/teams')
        .send({
          name: 'Test Team',
        })

      expect(response.status).toBe(401)
    })

    it('returns 401 with invalid auth token', async () => {
      const response = await request(app)
        .post('/api/teams')
        .set('Authorization', 'Bearer invalid-token-12345')
        .send({
          name: 'Test Team',
        })

      expect(response.status).toBe(401)
    })
  })

  describe('PUT /api/teams/:id', () => {
    it('returns 401 without auth token', async () => {
      const response = await request(app)
        .put('/api/teams/1')
        .send({
          name: 'Updated Team',
        })

      expect(response.status).toBe(401)
    })

    it('returns 401 with invalid auth token', async () => {
      const response = await request(app)
        .put('/api/teams/1')
        .set('Authorization', 'Bearer invalid-token-12345')
        .send({
          name: 'Updated Team',
        })

      expect(response.status).toBe(401)
    })
  })

  describe('DELETE /api/teams/:id', () => {
    it('returns 401 without auth token', async () => {
      const response = await request(app).delete('/api/teams/999')
      expect(response.status).toBe(401)
    })

    it('returns 401 with invalid auth token', async () => {
      const response = await request(app)
        .delete('/api/teams/999')
        .set('Authorization', 'Bearer invalid-token-12345')

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/teams/members/relationships', () => {
    it('returns 401 without auth token', async () => {
      const response = await request(app).get('/api/teams/members/relationships')
      expect(response.status).toBe(401)
    })

    it('returns 401 with invalid auth token', async () => {
      const response = await request(app)
        .get('/api/teams/members/relationships')
        .set('Authorization', 'Bearer invalid-token-12345')

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/teams/:teamId/members/:memberId', () => {
    it('returns 401 without auth token', async () => {
      const response = await request(app).post('/api/teams/1/members/1')
      expect(response.status).toBe(401)
    })

    it('returns 401 with invalid auth token', async () => {
      const response = await request(app)
        .post('/api/teams/1/members/1')
        .set('Authorization', 'Bearer invalid-token-12345')

      expect(response.status).toBe(401)
    })
  })
})
