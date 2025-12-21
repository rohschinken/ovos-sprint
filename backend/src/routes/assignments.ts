import { Router } from 'express'
import { db, projectAssignments, dayAssignments, assignmentGroups } from '../db/index.js'
import { projectAssignmentSchema, dayAssignmentSchema, assignmentGroupSchema, updateAssignmentGroupSchema } from '../utils/validation.js'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js'
import { eq, and, gte, lte } from 'drizzle-orm'
import { handleGroupMergeOnDayAdd, handleGroupSplitOnDayDelete } from '../utils/groupMerge.js'

const router = Router()

// Get all project assignments
router.get('/projects', authenticate, async (req, res) => {
  try {
    const assignments = await db.select().from(projectAssignments)

    const assignmentsWithDetails = await Promise.all(
      assignments.map(async (assignment) => {
        const project = await db.query.projects.findFirst({
          where: (projects, { eq }) => eq(projects.id, assignment.projectId),
        })

        const member = await db.query.teamMembers.findFirst({
          where: (teamMembers, { eq }) => eq(teamMembers.id, assignment.teamMemberId),
        })

        const days = await db.query.dayAssignments.findMany({
          where: (dayAssignments, { eq }) => eq(dayAssignments.projectAssignmentId, assignment.id),
        })

        return {
          ...assignment,
          project,
          teamMember: member,
          dayAssignments: days,
        }
      })
    )

    res.json(assignmentsWithDetails)
  } catch (error) {
    console.error('Get project assignments error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get project assignments for a specific project
router.get('/projects/:projectId', authenticate, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId)
    const assignments = await db
      .select()
      .from(projectAssignments)
      .where(eq(projectAssignments.projectId, projectId))

    const assignmentsWithDetails = await Promise.all(
      assignments.map(async (assignment) => {
        const member = await db.query.teamMembers.findFirst({
          where: (teamMembers, { eq }) => eq(teamMembers.id, assignment.teamMemberId),
        })

        const days = await db.query.dayAssignments.findMany({
          where: (dayAssignments, { eq }) => eq(dayAssignments.projectAssignmentId, assignment.id),
        })

        return {
          ...assignment,
          teamMember: member,
          dayAssignments: days,
        }
      })
    )

    res.json(assignmentsWithDetails)
  } catch (error) {
    console.error('Get project assignments error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get project assignments for a specific team member
router.get('/members/:memberId', authenticate, async (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId)
    const assignments = await db
      .select()
      .from(projectAssignments)
      .where(eq(projectAssignments.teamMemberId, memberId))

    const assignmentsWithDetails = await Promise.all(
      assignments.map(async (assignment) => {
        const project = await db.query.projects.findFirst({
          where: (projects, { eq }) => eq(projects.id, assignment.projectId),
        })

        const days = await db.query.dayAssignments.findMany({
          where: (dayAssignments, { eq }) => eq(dayAssignments.projectAssignmentId, assignment.id),
        })

        return {
          ...assignment,
          project,
          dayAssignments: days,
        }
      })
    )

    res.json(assignmentsWithDetails)
  } catch (error) {
    console.error('Get member assignments error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Create project assignment (admin only)
router.post('/projects', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const data = projectAssignmentSchema.parse(req.body)

    // Check if assignment already exists
    const existing = await db.query.projectAssignments.findFirst({
      where: (projectAssignments, { and, eq }) =>
        and(
          eq(projectAssignments.projectId, data.projectId),
          eq(projectAssignments.teamMemberId, data.teamMemberId)
        ),
    })

    if (existing) {
      return res.status(400).json({ error: 'Assignment already exists' })
    }

    const [assignment] = await db.insert(projectAssignments).values(data).returning()
    res.status(201).json(assignment)
  } catch (error) {
    console.error('Create assignment error:', error)
    res.status(400).json({ error: 'Invalid request' })
  }
})

// Delete project assignment (admin only)
router.delete('/projects/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const assignmentId = parseInt(req.params.id)
    await db.delete(projectAssignments).where(eq(projectAssignments.id, assignmentId))
    res.status(204).send()
  } catch (error) {
    console.error('Delete assignment error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get day assignments in date range
router.get('/days', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    let days
    if (startDate && endDate) {
      days = await db
        .select()
        .from(dayAssignments)
        .where(
          and(
            gte(dayAssignments.date, startDate as string),
            lte(dayAssignments.date, endDate as string)
          )
        )
    } else {
      days = await db.select().from(dayAssignments)
    }

    const daysWithDetails = await Promise.all(
      days.map(async (day) => {
        const assignment = await db.query.projectAssignments.findFirst({
          where: (projectAssignments, { eq }) => eq(projectAssignments.id, day.projectAssignmentId),
        })

        if (!assignment) return null

        const project = await db.query.projects.findFirst({
          where: (projects, { eq }) => eq(projects.id, assignment.projectId),
        })

        const member = await db.query.teamMembers.findFirst({
          where: (teamMembers, { eq }) => eq(teamMembers.id, assignment.teamMemberId),
        })

        return {
          ...day,
          projectAssignment: assignment,
          project,
          teamMember: member,
        }
      })
    )

    res.json(daysWithDetails.filter(Boolean))
  } catch (error) {
    console.error('Get day assignments error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Create day assignment (admin only)
router.post('/days', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const data = dayAssignmentSchema.parse(req.body)
    const [dayAssignment] = await db.insert(dayAssignments).values(data).returning()

    // Handle potential group merges when adding a day
    const mergeResult = await handleGroupMergeOnDayAdd(data.projectAssignmentId, data.date)

    res.status(201).json({
      ...dayAssignment,
      groupMerge: mergeResult.merged ? mergeResult : undefined
    })
  } catch (error) {
    console.error('Create day assignment error:', error)
    res.status(400).json({ error: 'Invalid request' })
  }
})

// Update day assignment (admin only)
router.put('/days/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id)
    const { comment } = req.body

    const [updated] = await db
      .update(dayAssignments)
      .set({ comment })
      .where(eq(dayAssignments.id, id))
      .returning()

    if (!updated) {
      return res.status(404).json({ error: 'Day assignment not found' })
    }

    res.json(updated)
  } catch (error) {
    console.error('Update day assignment error:', error)
    res.status(400).json({ error: 'Invalid request' })
  }
})

// Delete day assignment (admin only)
router.delete('/days/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id)

    // Get the day assignment first so we know its date and projectAssignmentId
    const dayAssignment = await db.query.dayAssignments.findFirst({
      where: (da, { eq }) => eq(da.id, id)
    })

    if (!dayAssignment) {
      return res.status(404).json({ error: 'Day assignment not found' })
    }

    // Delete the day assignment
    await db.delete(dayAssignments).where(eq(dayAssignments.id, id))

    // Handle potential group splits when deleting a day
    await handleGroupSplitOnDayDelete(
      dayAssignment.projectAssignmentId,
      dayAssignment.date
    )

    res.status(204).send()
  } catch (error) {
    console.error('Delete day assignment error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// ============== Assignment Groups ==============

// Get all assignment groups (optionally filtered by date range)
router.get('/groups', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    let groups
    // Filter groups that overlap with the date range
    if (startDate && endDate) {
      groups = await db
        .select()
        .from(assignmentGroups)
        .where(
          and(
            lte(assignmentGroups.startDate, endDate as string),
            gte(assignmentGroups.endDate, startDate as string)
          )
        )
    } else {
      groups = await db.select().from(assignmentGroups)
    }

    res.json(groups)
  } catch (error) {
    console.error('Get assignment groups error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Create assignment group (admin only)
router.post('/groups', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const data = assignmentGroupSchema.parse(req.body)

    // Validate that endDate >= startDate
    if (data.endDate < data.startDate) {
      return res.status(400).json({ error: 'endDate must be >= startDate' })
    }

    // Check for overlapping groups with the same projectAssignmentId
    const overlapping = await db
      .select()
      .from(assignmentGroups)
      .where(
        and(
          eq(assignmentGroups.projectAssignmentId, data.projectAssignmentId),
          lte(assignmentGroups.startDate, data.endDate),
          gte(assignmentGroups.endDate, data.startDate)
        )
      )

    if (overlapping.length > 0) {
      return res.status(400).json({
        error: 'Overlapping group exists',
        existingGroupId: overlapping[0].id
      })
    }

    const [group] = await db.insert(assignmentGroups).values(data).returning()
    res.status(201).json(group)
  } catch (error) {
    console.error('Create assignment group error:', error)
    res.status(400).json({ error: 'Invalid request' })
  }
})

// Update assignment group (admin only)
router.put('/groups/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id)
    const data = updateAssignmentGroupSchema.parse(req.body)

    const updateData: { priority?: 'high' | 'normal' | 'low'; comment?: string | null } = {}
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.comment !== undefined) updateData.comment = data.comment

    const [updated] = await db
      .update(assignmentGroups)
      .set(updateData)
      .where(eq(assignmentGroups.id, id))
      .returning()

    if (!updated) {
      return res.status(404).json({ error: 'Assignment group not found' })
    }

    res.json(updated)
  } catch (error) {
    console.error('Update assignment group error:', error)
    res.status(400).json({ error: 'Invalid request' })
  }
})

// Delete assignment group (admin only)
router.delete('/groups/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id)
    await db.delete(assignmentGroups).where(eq(assignmentGroups.id, id))
    res.status(204).send()
  } catch (error) {
    console.error('Delete assignment group error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
