import { Express } from 'express'
import request from 'supertest'

/**
 * Helper to create authenticated requests
 */
export function authenticatedRequest(app: Express, token: string) {
  return request(app).set('Authorization', `Bearer ${token}`)
}

/**
 * Helper to create test user and get JWT token
 */
export async function getAuthToken(app: Express): Promise<string> {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'test@example.com',
      password: 'testpassword123',
    })

  return response.body.token
}

/**
 * Mock data generators
 */
export const mockUser = {
  email: 'test@example.com',
  password: 'testpassword123',
  role: 'admin' as const,
}

export const mockProject = {
  name: 'Test Project',
  customerId: 1,
  status: 'confirmed' as const,
  managerId: null,
}

export const mockMember = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  workSchedule: JSON.stringify({
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: false,
    sun: false,
  }),
}
