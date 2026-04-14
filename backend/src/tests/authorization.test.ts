import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { db, users, projects, customers } from '../db/index.js'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { canModifyProject } from '../utils/authorization.js'

describe('canModifyProject', () => {
  let adminUserId: number
  let pmUserId: number
  let regularUserId: number
  let ownedProjectId: number
  let otherProjectId: number
  let customerId: number

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('testpassword123', 10)

    // Create admin user
    const [adminUser] = await db.insert(users).values({
      email: 'authz-admin@test.com',
      passwordHash: hashedPassword,
      role: 'admin',
    }).returning()
    adminUserId = adminUser.id

    // Create project manager user
    const [pmUser] = await db.insert(users).values({
      email: 'authz-pm@test.com',
      passwordHash: hashedPassword,
      role: 'project_manager',
    }).returning()
    pmUserId = pmUser.id

    // Create regular user
    const [regularUser] = await db.insert(users).values({
      email: 'authz-user@test.com',
      passwordHash: hashedPassword,
      role: 'user',
    }).returning()
    regularUserId = regularUser.id

    // Create a customer for projects
    const [customer] = await db.insert(customers).values({
      name: 'Authz Test Customer',
    }).returning()
    customerId = customer.id
  })

  beforeEach(async () => {
    await db.delete(projects).where(eq(projects.customerId, customerId))

    // Create a project owned by pmUser
    const [ownedProject] = await db.insert(projects).values({
      name: 'PM Owned Project',
      customerId,
      status: 'confirmed',
      managerId: pmUserId,
    }).returning()
    ownedProjectId = ownedProject.id

    // Create a project owned by someone else
    const [otherProject] = await db.insert(projects).values({
      name: 'Other Project',
      customerId,
      status: 'confirmed',
      managerId: adminUserId,
    }).returning()
    otherProjectId = otherProject.id
  })

  afterAll(async () => {
    await db.delete(projects).where(eq(projects.customerId, customerId))
    await db.delete(customers).where(eq(customers.id, customerId))
    await db.delete(users).where(eq(users.email, 'authz-admin@test.com'))
    await db.delete(users).where(eq(users.email, 'authz-pm@test.com'))
    await db.delete(users).where(eq(users.email, 'authz-user@test.com'))
  })

  it('returns true for admin regardless of project ownership', async () => {
    const result = await canModifyProject(adminUserId, 'admin', otherProjectId)
    expect(result).toBe(true)
  })

  it('returns true for project manager who owns the project', async () => {
    const result = await canModifyProject(pmUserId, 'project_manager', ownedProjectId)
    expect(result).toBe(true)
  })

  it('returns false for project manager who does not own the project', async () => {
    const result = await canModifyProject(pmUserId, 'project_manager', otherProjectId)
    expect(result).toBe(false)
  })

  it('returns false for regular user', async () => {
    const result = await canModifyProject(regularUserId, 'user', ownedProjectId)
    expect(result).toBe(false)
  })

  it('returns false for non-existent project', async () => {
    const result = await canModifyProject(pmUserId, 'project_manager', 999999)
    expect(result).toBe(false)
  })
})
