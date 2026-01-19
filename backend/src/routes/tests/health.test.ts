import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../index'

describe('Health Check', () => {
  it('GET /health returns 200 with status ok', async () => {
    const response = await request(app).get('/health')

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('status', 'ok')
    expect(response.body).toHaveProperty('timestamp')
  })

  it('health check includes valid ISO timestamp', async () => {
    const response = await request(app).get('/health')

    const timestamp = new Date(response.body.timestamp)
    expect(timestamp.toString()).not.toBe('Invalid Date')
  })
})
