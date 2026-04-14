import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import app from '../../index.js'
import { db, users, customers, projects, milestones } from '../../db/index.js'
import { eq } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

describe('GET /api/milestones - SQL filtering', () => {
  let adminToken: string
  let customerId: number
  let projectAId: number
  let projectBId: number

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('testpassword123', 10)

    const [adminUser] = await db.insert(users).values({
      email: 'milestone-filter-admin@test.com',
      passwordHash: hashedPassword,
      role: 'admin',
    }).returning()
    adminToken = jwt.sign(
      { userId: adminUser.id, email: adminUser.email, role: adminUser.role },
      process.env.JWT_SECRET || 'test-secret'
    )

    const [customer] = await db.insert(customers).values({
      name: 'Milestone Filter Test Customer',
    }).returning()
    customerId = customer.id

    const [projectA] = await db.insert(projects).values({
      name: 'Milestone Project A',
      customerId,
      status: 'confirmed',
    }).returning()
    projectAId = projectA.id

    const [projectB] = await db.insert(projects).values({
      name: 'Milestone Project B',
      customerId,
      status: 'confirmed',
    }).returning()
    projectBId = projectB.id
  })

  beforeEach(async () => {
    // Clean milestones for our test projects
    await db.delete(milestones).where(eq(milestones.projectId, projectAId))
    await db.delete(milestones).where(eq(milestones.projectId, projectBId))

    // Seed milestones across dates and projects
    await db.insert(milestones).values([
      { projectId: projectAId, date: '2026-03-01', name: 'A - March' },
      { projectId: projectAId, date: '2026-04-15', name: 'A - April' },
      { projectId: projectAId, date: '2026-05-30', name: 'A - May' },
      { projectId: projectBId, date: '2026-03-15', name: 'B - March' },
      { projectId: projectBId, date: '2026-04-20', name: 'B - April' },
    ])
  })

  afterAll(async () => {
    await db.delete(milestones).where(eq(milestones.projectId, projectAId))
    await db.delete(milestones).where(eq(milestones.projectId, projectBId))
    await db.delete(projects).where(eq(projects.customerId, customerId))
    await db.delete(customers).where(eq(customers.id, customerId))
    await db.delete(users).where(eq(users.email, 'milestone-filter-admin@test.com'))
  })

  it('returns all milestones when no filters provided', async () => {
    const response = await request(app)
      .get('/api/milestones')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(response.status).toBe(200)
    // Should contain at least our 5 test milestones
    const ourMilestones = response.body.filter(
      (m: { projectId: number }) => m.projectId === projectAId || m.projectId === projectBId
    )
    expect(ourMilestones).toHaveLength(5)
  })

  it('returns only milestones for the given projectId', async () => {
    const response = await request(app)
      .get(`/api/milestones?projectId=${projectAId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(response.status).toBe(200)
    expect(response.body.every((m: { projectId: number }) => m.projectId === projectAId)).toBe(true)
    expect(response.body).toHaveLength(3)
  })

  it('returns milestones within startDate/endDate range', async () => {
    const response = await request(app)
      .get('/api/milestones?startDate=2026-04-01&endDate=2026-04-30')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(response.status).toBe(200)
    // Should return A-April and B-April only from our test data
    const ourMilestones = response.body.filter(
      (m: { projectId: number }) => m.projectId === projectAId || m.projectId === projectBId
    )
    expect(ourMilestones).toHaveLength(2)
    expect(ourMilestones.map((m: { name: string }) => m.name)).toEqual(
      expect.arrayContaining(['A - April', 'B - April'])
    )
  })

  it('combines projectId + date range filters', async () => {
    const response = await request(app)
      .get(`/api/milestones?projectId=${projectAId}&startDate=2026-04-01&endDate=2026-05-31`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(response.status).toBe(200)
    expect(response.body).toHaveLength(2)
    expect(response.body.every((m: { projectId: number }) => m.projectId === projectAId)).toBe(true)
    expect(response.body.map((m: { name: string }) => m.name)).toEqual(['A - April', 'A - May'])
  })

  it('filters correctly at date boundaries (inclusive)', async () => {
    // startDate = exact date of a milestone
    const response = await request(app)
      .get('/api/milestones?startDate=2026-04-15&endDate=2026-04-15')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(response.status).toBe(200)
    const ourMilestones = response.body.filter(
      (m: { projectId: number }) => m.projectId === projectAId || m.projectId === projectBId
    )
    expect(ourMilestones).toHaveLength(1)
    expect(ourMilestones[0].name).toBe('A - April')
  })

  it('returns empty array when no milestones match filters', async () => {
    const response = await request(app)
      .get('/api/milestones?startDate=2027-01-01&endDate=2027-12-31')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(response.status).toBe(200)
    const ourMilestones = response.body.filter(
      (m: { projectId: number }) => m.projectId === projectAId || m.projectId === projectBId
    )
    expect(ourMilestones).toHaveLength(0)
  })

  it('returns milestones ordered by date ascending', async () => {
    const response = await request(app)
      .get(`/api/milestones?projectId=${projectAId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(response.status).toBe(200)
    const dates = response.body.map((m: { date: string }) => m.date)
    expect(dates).toEqual([...dates].sort())
  })
})
