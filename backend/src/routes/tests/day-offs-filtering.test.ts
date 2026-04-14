import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import app from '../../index.js'
import { db, users, teamMembers, dayOffs } from '../../db/index.js'
import { eq } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

describe('GET /api/day-offs - SQL filtering', () => {
  let adminToken: string
  let memberId: number

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('testpassword123', 10)

    const [adminUser] = await db.insert(users).values({
      email: 'dayoff-filter-admin@test.com',
      passwordHash: hashedPassword,
      role: 'admin',
    }).returning()
    adminToken = jwt.sign(
      { userId: adminUser.id, email: adminUser.email, role: adminUser.role },
      process.env.JWT_SECRET || 'test-secret'
    )

    const [member] = await db.insert(teamMembers).values({
      firstName: 'DayOff',
      lastName: 'FilterTest',
      email: 'dayoff-filter@test.com',
    }).returning()
    memberId = member.id
  })

  beforeEach(async () => {
    await db.delete(dayOffs).where(eq(dayOffs.teamMemberId, memberId))

    // Seed day-offs across a date range
    await db.insert(dayOffs).values([
      { teamMemberId: memberId, date: '2026-03-01' },
      { teamMemberId: memberId, date: '2026-04-10' },
      { teamMemberId: memberId, date: '2026-04-20' },
      { teamMemberId: memberId, date: '2026-05-15' },
    ])
  })

  afterAll(async () => {
    await db.delete(dayOffs).where(eq(dayOffs.teamMemberId, memberId))
    await db.delete(teamMembers).where(eq(teamMembers.id, memberId))
    await db.delete(users).where(eq(users.email, 'dayoff-filter-admin@test.com'))
  })

  it('returns all day-offs when no filters provided', async () => {
    const response = await request(app)
      .get('/api/day-offs')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(response.status).toBe(200)
    const ours = response.body.filter(
      (d: { teamMemberId: number }) => d.teamMemberId === memberId
    )
    expect(ours).toHaveLength(4)
  })

  it('returns day-offs within startDate/endDate range', async () => {
    const response = await request(app)
      .get('/api/day-offs?startDate=2026-04-01&endDate=2026-04-30')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(response.status).toBe(200)
    const ours = response.body.filter(
      (d: { teamMemberId: number }) => d.teamMemberId === memberId
    )
    expect(ours).toHaveLength(2)
    expect(ours.map((d: { date: string }) => d.date)).toEqual(
      expect.arrayContaining(['2026-04-10', '2026-04-20'])
    )
  })

  it('filters correctly at date boundaries (inclusive)', async () => {
    const response = await request(app)
      .get('/api/day-offs?startDate=2026-04-10&endDate=2026-04-10')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(response.status).toBe(200)
    const ours = response.body.filter(
      (d: { teamMemberId: number }) => d.teamMemberId === memberId
    )
    expect(ours).toHaveLength(1)
    expect(ours[0].date).toBe('2026-04-10')
  })

  it('returns only day-offs after startDate when endDate is omitted', async () => {
    const response = await request(app)
      .get('/api/day-offs?startDate=2026-04-15')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(response.status).toBe(200)
    const ours = response.body.filter(
      (d: { teamMemberId: number }) => d.teamMemberId === memberId
    )
    expect(ours).toHaveLength(2)
    expect(ours.map((d: { date: string }) => d.date)).toEqual(
      expect.arrayContaining(['2026-04-20', '2026-05-15'])
    )
  })

  it('returns only day-offs before endDate when startDate is omitted', async () => {
    const response = await request(app)
      .get('/api/day-offs?endDate=2026-04-15')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(response.status).toBe(200)
    const ours = response.body.filter(
      (d: { teamMemberId: number }) => d.teamMemberId === memberId
    )
    expect(ours).toHaveLength(2)
    expect(ours.map((d: { date: string }) => d.date)).toEqual(
      expect.arrayContaining(['2026-03-01', '2026-04-10'])
    )
  })

  it('returns empty array when no day-offs match filters', async () => {
    const response = await request(app)
      .get('/api/day-offs?startDate=2027-01-01&endDate=2027-12-31')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(response.status).toBe(200)
    const ours = response.body.filter(
      (d: { teamMemberId: number }) => d.teamMemberId === memberId
    )
    expect(ours).toHaveLength(0)
  })

  it('returns day-offs ordered by date ascending', async () => {
    const response = await request(app)
      .get('/api/day-offs')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(response.status).toBe(200)
    const ours = response.body.filter(
      (d: { teamMemberId: number }) => d.teamMemberId === memberId
    )
    const dates = ours.map((d: { date: string }) => d.date)
    expect(dates).toEqual([...dates].sort())
  })
})
