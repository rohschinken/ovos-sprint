import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import app from '../index.js'
import { db, users, teamMembers, dayOffs } from '../db/index.js'
import { eq } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

describe('Day-Offs Permissions', () => {
  let adminToken: string
  let userToken: string
  let regularUserId: number
  let otherUserId: number
  let ownMemberId: number
  let otherMemberId: number
  let unlinkedMemberId: number

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('testpassword123', 10)

    // Create admin user
    const [adminUser] = await db.insert(users).values({
      email: 'dayoff-admin@test.com',
      passwordHash: hashedPassword,
      role: 'admin',
    }).returning()
    adminToken = jwt.sign(
      { userId: adminUser.id, email: adminUser.email, role: adminUser.role },
      process.env.JWT_SECRET || 'test-secret'
    )

    // Create regular user
    const [regularUser] = await db.insert(users).values({
      email: 'dayoff-user@test.com',
      passwordHash: hashedPassword,
      role: 'user',
    }).returning()
    regularUserId = regularUser.id
    userToken = jwt.sign(
      { userId: regularUser.id, email: regularUser.email, role: regularUser.role },
      process.env.JWT_SECRET || 'test-secret'
    )

    // Create another regular user
    const [otherUser] = await db.insert(users).values({
      email: 'dayoff-other@test.com',
      passwordHash: hashedPassword,
      role: 'user',
    }).returning()
    otherUserId = otherUser.id
    // otherUser exists to own otherMember; no token needed for current tests
  })

  beforeEach(async () => {
    await db.delete(dayOffs)
    await db.delete(teamMembers)

    // Create member linked to regularUser
    const [ownMember] = await db.insert(teamMembers).values({
      firstName: 'Own',
      lastName: 'Member',
      email: 'dayoff-user@test.com',
      userId: regularUserId,
    }).returning()
    ownMemberId = ownMember.id

    // Create member linked to otherUser
    const [otherMember] = await db.insert(teamMembers).values({
      firstName: 'Other',
      lastName: 'Member',
      email: 'dayoff-other@test.com',
      userId: otherUserId,
    }).returning()
    otherMemberId = otherMember.id

    // Create unlinked member
    const [unlinkedMember] = await db.insert(teamMembers).values({
      firstName: 'Unlinked',
      lastName: 'Member',
      email: 'dayoff-unlinked@test.com',
    }).returning()
    unlinkedMemberId = unlinkedMember.id
  })

  afterAll(async () => {
    await db.delete(dayOffs)
    await db.delete(teamMembers)
    await db.delete(users).where(eq(users.email, 'dayoff-admin@test.com'))
    await db.delete(users).where(eq(users.email, 'dayoff-user@test.com'))
    await db.delete(users).where(eq(users.email, 'dayoff-other@test.com'))
  })

  describe('POST /api/day-offs', () => {
    it('allows admin to create day-off for any member', async () => {
      const response = await request(app)
        .post('/api/day-offs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ teamMemberId: otherMemberId, date: '2026-04-01' })

      expect(response.status).toBe(201)
      expect(response.body.teamMemberId).toBe(otherMemberId)
    })

    it('allows user to create day-off for own linked member', async () => {
      const response = await request(app)
        .post('/api/day-offs')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ teamMemberId: ownMemberId, date: '2026-04-01' })

      expect(response.status).toBe(201)
      expect(response.body.teamMemberId).toBe(ownMemberId)
    })

    it('denies user creating day-off for another member', async () => {
      const response = await request(app)
        .post('/api/day-offs')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ teamMemberId: otherMemberId, date: '2026-04-01' })

      expect(response.status).toBe(403)
      expect(response.body.error).toMatch(/own day-offs/)
    })

    it('denies user creating day-off for unlinked member', async () => {
      const response = await request(app)
        .post('/api/day-offs')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ teamMemberId: unlinkedMemberId, date: '2026-04-01' })

      expect(response.status).toBe(403)
    })

    it('returns 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/day-offs')
        .send({ teamMemberId: ownMemberId, date: '2026-04-01' })

      expect(response.status).toBe(401)
    })
  })

  describe('DELETE /api/day-offs/:id', () => {
    it('allows admin to delete any day-off', async () => {
      // Create a day-off for otherMember
      const createRes = await request(app)
        .post('/api/day-offs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ teamMemberId: otherMemberId, date: '2026-05-01' })

      const response = await request(app)
        .delete(`/api/day-offs/${createRes.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(204)
    })

    it('allows user to delete own day-off', async () => {
      // Create a day-off for ownMember
      const createRes = await request(app)
        .post('/api/day-offs')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ teamMemberId: ownMemberId, date: '2026-05-01' })

      const response = await request(app)
        .delete(`/api/day-offs/${createRes.body.id}`)
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(204)
    })

    it('denies user deleting another member\'s day-off', async () => {
      // Admin creates a day-off for otherMember
      const createRes = await request(app)
        .post('/api/day-offs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ teamMemberId: otherMemberId, date: '2026-05-02' })

      // regularUser tries to delete it
      const response = await request(app)
        .delete(`/api/day-offs/${createRes.body.id}`)
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(403)
      expect(response.body.error).toMatch(/own day-offs/)
    })

    it('returns 404 for non-existent day-off when user tries to delete', async () => {
      const response = await request(app)
        .delete('/api/day-offs/999999')
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(404)
    })

    it('returns 401 without auth token', async () => {
      const response = await request(app).delete('/api/day-offs/1')
      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/day-offs', () => {
    it('allows any authenticated user to read day-offs', async () => {
      // Create some day-offs as admin
      await request(app)
        .post('/api/day-offs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ teamMemberId: ownMemberId, date: '2026-06-01' })
      await request(app)
        .post('/api/day-offs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ teamMemberId: otherMemberId, date: '2026-06-02' })

      const response = await request(app)
        .get('/api/day-offs')
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(200)
      expect(response.body.length).toBeGreaterThanOrEqual(2)
    })
  })
})
