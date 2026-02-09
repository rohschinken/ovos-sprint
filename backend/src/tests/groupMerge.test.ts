import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { db, projectAssignments, dayAssignments, assignmentGroups, teamMembers, projects, users, customers } from '../db/index.js'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import {
  handleAssignmentMerge,
  handleGroupMergeOnDayAdd,
  handleBatchGroupMerge,
  cleanupOrphanedGroups
} from '../utils/groupMerge.js'

describe('Group Merge Logic', () => {
  let testProjectId: number
  let testMemberId: number
  let testPAId: number
  let testUserId: number
  let testCustomerId: number

  beforeAll(async () => {
    // Note: Schema is automatically applied to test database via drizzle-orm
    // The test database is empty at this point and tables will be created on first use

    // Create test user
    const hashedPassword = await bcrypt.hash('testpassword123', 10)
    const [user] = await db.insert(users).values({
      email: 'test@groupmerge.com',
      passwordHash: hashedPassword,
      role: 'admin',
    }).returning()
    testUserId = user.id

    // Create test customer
    const [customer] = await db.insert(customers).values({
      name: 'Test Customer Merge',
      managerId: user.id,
    }).returning()
    testCustomerId = customer.id
  })

  beforeEach(async () => {
    // Clean up test data
    await db.delete(assignmentGroups)
    await db.delete(dayAssignments)
    await db.delete(projectAssignments)
    await db.delete(teamMembers)
    await db.delete(projects)

    // Create test project
    const [project] = await db.insert(projects).values({
      name: 'Test Project Merge',
      customerId: testCustomerId,
      managerId: testUserId,
    }).returning()
    testProjectId = project.id

    // Create test member
    const [member] = await db.insert(teamMembers).values({
      firstName: 'Test',
      lastName: 'Member Merge',
    }).returning()
    testMemberId = member.id

    // Create test project assignment
    const [pa] = await db.insert(projectAssignments).values({
      projectId: testProjectId,
      teamMemberId: testMemberId,
    }).returning()
    testPAId = pa.id
  })

  afterAll(async () => {
    // Final cleanup
    await db.delete(assignmentGroups)
    await db.delete(dayAssignments)
    await db.delete(projectAssignments)
    await db.delete(teamMembers)
    await db.delete(projects)
    await db.delete(customers)
    await db.delete(users).where(eq(users.email, 'test@groupmerge.com'))
  })

  describe('Duplicate Day Removal', () => {
    it('should remove duplicate days within the same ProjectAssignment', async () => {
      // Create duplicate days
      await db.insert(dayAssignments).values([
        { projectAssignmentId: testPAId, date: '2026-02-01' },
        { projectAssignmentId: testPAId, date: '2026-02-01' }, // Duplicate
        { projectAssignmentId: testPAId, date: '2026-02-02' },
      ])

      // Create a group
      await db.insert(assignmentGroups).values({
        projectAssignmentId: testPAId,
        startDate: '2026-02-01',
        endDate: '2026-02-02',
        priority: 'normal',
      })

      // Run merge
      await handleAssignmentMerge(testPAId, ['2026-02-01', '2026-02-02'])

      // Check that only one day 2026-02-01 remains
      const days = await db.query.dayAssignments.findMany({
        where: (da, { eq }) => eq(da.projectAssignmentId, testPAId),
      })

      expect(days.length).toBe(2) // Should have 2 days, not 3
      expect(days.filter(d => d.date === '2026-02-01').length).toBe(1)
    })
  })

  describe('Cross-ProjectAssignment Merges', () => {
    it('should merge overlapping ProjectAssignments from same project+member', async () => {
      // Create second PA for same project+member
      const [pa2] = await db.insert(projectAssignments).values({
        projectId: testProjectId,
        teamMemberId: testMemberId,
      }).returning()

      // PA1: days 1-3
      await db.insert(dayAssignments).values([
        { projectAssignmentId: testPAId, date: '2026-02-01' },
        { projectAssignmentId: testPAId, date: '2026-02-02' },
        { projectAssignmentId: testPAId, date: '2026-02-03' },
      ])

      // PA2: days 3-5 (overlaps at day 3)
      await db.insert(dayAssignments).values([
        { projectAssignmentId: pa2.id, date: '2026-02-03' },
        { projectAssignmentId: pa2.id, date: '2026-02-04' },
        { projectAssignmentId: pa2.id, date: '2026-02-05' },
      ])

      // Create groups
      await db.insert(assignmentGroups).values([
        { projectAssignmentId: testPAId, startDate: '2026-02-01', endDate: '2026-02-03', priority: 'normal' },
        { projectAssignmentId: pa2.id, startDate: '2026-02-03', endDate: '2026-02-05', priority: 'high' },
      ])

      // Run merge with expandSearchForAdjacent
      await handleAssignmentMerge(testPAId, ['2026-02-01', '2026-02-02', '2026-02-03'], {
        expandSearchForAdjacent: true
      })

      // PA2 should be deleted, all days transferred to PA1
      const pa2Days = await db.query.dayAssignments.findMany({
        where: (da, { eq }) => eq(da.projectAssignmentId, pa2.id),
      })
      expect(pa2Days.length).toBe(0)

      // PA1 should have all days (duplicates removed)
      const pa1Days = await db.query.dayAssignments.findMany({
        where: (da, { eq }) => eq(da.projectAssignmentId, testPAId),
      })
      // Should have 5 unique days (duplicates removed by merge logic)
      const uniqueDates = [...new Set(pa1Days.map(d => d.date))]
      expect(uniqueDates.length).toBe(5) // Days 1-5 unique
      expect(uniqueDates.sort()).toEqual(['2026-02-01', '2026-02-02', '2026-02-03', '2026-02-04', '2026-02-05'])

      // PA2 groups should be deleted
      const pa2Groups = await db.query.assignmentGroups.findMany({
        where: (ag, { eq }) => eq(ag.projectAssignmentId, pa2.id),
      })
      expect(pa2Groups.length).toBe(0)
    })

    it('should NOT merge ProjectAssignments from different projects', async () => {
      // Create second project
      const [project2] = await db.insert(projects).values({
        name: 'Test Project 2',
        customerId: testCustomerId,
        managerId: testUserId,
      }).returning()

      // Create PA for different project, same member
      const [pa2] = await db.insert(projectAssignments).values({
        projectId: project2.id, // Different project
        teamMemberId: testMemberId,
      }).returning()

      // PA1: days 1-3
      await db.insert(dayAssignments).values([
        { projectAssignmentId: testPAId, date: '2026-02-01' },
        { projectAssignmentId: testPAId, date: '2026-02-02' },
        { projectAssignmentId: testPAId, date: '2026-02-03' },
      ])

      // PA2: days 3-5 (overlaps but different project)
      await db.insert(dayAssignments).values([
        { projectAssignmentId: pa2.id, date: '2026-02-03' },
        { projectAssignmentId: pa2.id, date: '2026-02-04' },
        { projectAssignmentId: pa2.id, date: '2026-02-05' },
      ])

      // Run merge
      await handleAssignmentMerge(testPAId, ['2026-02-01', '2026-02-02', '2026-02-03'], {
        expandSearchForAdjacent: true
      })

      // PA2 should NOT be deleted (different project)
      const pa2Days = await db.query.dayAssignments.findMany({
        where: (da, { eq }) => eq(da.projectAssignmentId, pa2.id),
      })
      expect(pa2Days.length).toBe(3) // Still has its days
    })
  })

  describe('Adjacent Block Merging', () => {
    it('should merge adjacent blocks when gap is filled', async () => {
      // Create Block A: days 1-2
      await db.insert(dayAssignments).values([
        { projectAssignmentId: testPAId, date: '2026-02-01' },
        { projectAssignmentId: testPAId, date: '2026-02-02' },
      ])

      // Create Block B: days 4-5
      await db.insert(dayAssignments).values([
        { projectAssignmentId: testPAId, date: '2026-02-04' },
        { projectAssignmentId: testPAId, date: '2026-02-05' },
      ])

      // Create separate groups
      await db.insert(assignmentGroups).values([
        { projectAssignmentId: testPAId, startDate: '2026-02-01', endDate: '2026-02-02', priority: 'normal' },
        { projectAssignmentId: testPAId, startDate: '2026-02-04', endDate: '2026-02-05', priority: 'high' },
      ])

      // Fill the gap by adding day 3
      await db.insert(dayAssignments).values({
        projectAssignmentId: testPAId,
        date: '2026-02-03',
      })

      // Run merge on the new date
      await handleGroupMergeOnDayAdd(testPAId, '2026-02-03')

      // Should have only 1 group spanning days 1-5
      const groups = await db.query.assignmentGroups.findMany({
        where: (ag, { eq }) => eq(ag.projectAssignmentId, testPAId),
      })
      expect(groups.length).toBe(1)
      expect(groups[0].startDate).toBe('2026-02-01')
      expect(groups[0].endDate).toBe('2026-02-05')
    })
  })

  describe('Batch Group Merge', () => {
    it('should merge new days created adjacent to existing group with comment/priority', async () => {
      // Scenario: Day 5 has assignment with comment and priority
      // User drags from day 4 to day 3 to create new assignment
      // Expected: Days 3-5 should all be in one group with the original comment/priority

      // Existing day 5 with group
      await db.insert(dayAssignments).values({
        projectAssignmentId: testPAId,
        date: '2026-02-05',
      })
      await db.insert(assignmentGroups).values({
        projectAssignmentId: testPAId,
        startDate: '2026-02-05',
        endDate: '2026-02-05',
        priority: 'high',
        comment: 'Important task',
      })

      // User creates days 3-4 via drag
      await db.insert(dayAssignments).values([
        { projectAssignmentId: testPAId, date: '2026-02-03' },
        { projectAssignmentId: testPAId, date: '2026-02-04' },
      ])

      // Run batch merge (this is what the batch endpoint calls)
      await handleBatchGroupMerge(testPAId)

      // Should have only 1 group spanning days 3-5
      const groups = await db.query.assignmentGroups.findMany({
        where: (ag, { eq }) => eq(ag.projectAssignmentId, testPAId),
      })
      expect(groups.length).toBe(1)
      expect(groups[0].startDate).toBe('2026-02-03')
      expect(groups[0].endDate).toBe('2026-02-05')
      // The existing group (day 5) had the comment and priority - it should survive
      expect(groups[0].priority).toBe('high')
      expect(groups[0].comment).toBe('Important task')
    })

    it('should create default group for orphan days with no adjacent groups', async () => {
      // Create days with no existing groups
      await db.insert(dayAssignments).values([
        { projectAssignmentId: testPAId, date: '2026-02-10' },
        { projectAssignmentId: testPAId, date: '2026-02-11' },
        { projectAssignmentId: testPAId, date: '2026-02-12' },
      ])

      await handleBatchGroupMerge(testPAId)

      const groups = await db.query.assignmentGroups.findMany({
        where: (ag, { eq }) => eq(ag.projectAssignmentId, testPAId),
      })
      expect(groups.length).toBe(1)
      expect(groups[0].startDate).toBe('2026-02-10')
      expect(groups[0].endDate).toBe('2026-02-12')
      expect(groups[0].priority).toBe('normal')
    })

    it('should merge multiple touching groups into the largest one', async () => {
      // Group A: days 1-3 (normal priority)
      await db.insert(dayAssignments).values([
        { projectAssignmentId: testPAId, date: '2026-02-01' },
        { projectAssignmentId: testPAId, date: '2026-02-02' },
        { projectAssignmentId: testPAId, date: '2026-02-03' },
      ])
      await db.insert(assignmentGroups).values({
        projectAssignmentId: testPAId,
        startDate: '2026-02-01',
        endDate: '2026-02-03',
        priority: 'normal',
      })

      // Group B: days 5-7 (high priority, has comment)
      await db.insert(dayAssignments).values([
        { projectAssignmentId: testPAId, date: '2026-02-05' },
        { projectAssignmentId: testPAId, date: '2026-02-06' },
        { projectAssignmentId: testPAId, date: '2026-02-07' },
      ])
      await db.insert(assignmentGroups).values({
        projectAssignmentId: testPAId,
        startDate: '2026-02-05',
        endDate: '2026-02-07',
        priority: 'high',
        comment: 'Sprint goal',
      })

      // Fill gap with day 4 (connecting both groups)
      await db.insert(dayAssignments).values({
        projectAssignmentId: testPAId,
        date: '2026-02-04',
      })

      await handleBatchGroupMerge(testPAId)

      const groups = await db.query.assignmentGroups.findMany({
        where: (ag, { eq }) => eq(ag.projectAssignmentId, testPAId),
      })
      expect(groups.length).toBe(1)
      expect(groups[0].startDate).toBe('2026-02-01')
      expect(groups[0].endDate).toBe('2026-02-07')
      // Both groups are same size (3 days), so the first one (by sort order of dayCount desc, then whatever) survives
      // The important thing is that ONE group survives with the full range
    })
  })

  describe('Orphaned Group Cleanup', () => {
    it('should remove groups with no day assignments', async () => {
      // Create a group with no actual days
      await db.insert(assignmentGroups).values({
        projectAssignmentId: testPAId,
        startDate: '2026-02-01',
        endDate: '2026-02-05',
        priority: 'normal',
      })

      // Run cleanup
      const deletedIds = await cleanupOrphanedGroups(testPAId)

      expect(deletedIds.length).toBe(1)

      // Verify group is deleted
      const groups = await db.query.assignmentGroups.findMany({
        where: (ag, { eq }) => eq(ag.projectAssignmentId, testPAId),
      })
      expect(groups.length).toBe(0)
    })

    it('should NOT remove groups with day assignments', async () => {
      // Create days
      await db.insert(dayAssignments).values([
        { projectAssignmentId: testPAId, date: '2026-02-01' },
        { projectAssignmentId: testPAId, date: '2026-02-02' },
      ])

      // Create a group
      await db.insert(assignmentGroups).values({
        projectAssignmentId: testPAId,
        startDate: '2026-02-01',
        endDate: '2026-02-02',
        priority: 'normal',
      })

      // Run cleanup
      const deletedIds = await cleanupOrphanedGroups(testPAId)

      expect(deletedIds.length).toBe(0)

      // Verify group still exists
      const groups = await db.query.assignmentGroups.findMany({
        where: (ag, { eq }) => eq(ag.projectAssignmentId, testPAId),
      })
      expect(groups.length).toBe(1)
    })
  })
})
