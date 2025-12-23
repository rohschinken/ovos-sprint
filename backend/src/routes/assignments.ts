import { Router } from 'express'
import { db, projectAssignments, dayAssignments, assignmentGroups } from '../db/index.js'
import { projectAssignmentSchema, dayAssignmentSchema, assignmentGroupSchema, updateAssignmentGroupSchema } from '../utils/validation.js'
import { authenticate, requireAdminOrProjectManager, AuthRequest } from '../middleware/auth.js'
import { eq, and, gte, lte } from 'drizzle-orm'
import { handleGroupMergeOnDayAdd, handleGroupSplitOnDayDelete } from '../utils/groupMerge.js'

const router = Router()

// Helper to check if user can modify a project (admin or project owner)
async function canModifyProject(userId: number, userRole: string, projectId: number): Promise<boolean> {
  if (userRole === 'admin') return true

  const project = await db.query.projects.findFirst({
    where: (projects, { eq }) => eq(projects.id, projectId),
  })

  return project?.managerId === userId
}

// Helper to get projectId from a project assignment
async function getProjectIdFromAssignment(projectAssignmentId: number): Promise<number | null> {
  const assignment = await db.query.projectAssignments.findFirst({
    where: (pa, { eq }) => eq(pa.id, projectAssignmentId),
  })
  return assignment?.projectId ?? null
}

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

// Create project assignment (admin or project manager for their own projects)
router.post('/projects', authenticate, requireAdminOrProjectManager, async (req: AuthRequest, res) => {
  try {
    const data = projectAssignmentSchema.parse(req.body)

    // Check if user can modify this project
    if (!await canModifyProject(req.user!.userId, req.user!.role, data.projectId)) {
      return res.status(403).json({ error: 'You can only assign members to your own projects' })
    }

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

// Delete project assignment (admin or project manager for their own projects)
router.delete('/projects/:id', authenticate, requireAdminOrProjectManager, async (req: AuthRequest, res) => {
  try {
    const assignmentId = parseInt(req.params.id)

    // Get the assignment to check project ownership
    const assignment = await db.query.projectAssignments.findFirst({
      where: (pa, { eq }) => eq(pa.id, assignmentId),
    })

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' })
    }

    // Check if user can modify this project
    if (!await canModifyProject(req.user!.userId, req.user!.role, assignment.projectId)) {
      return res.status(403).json({ error: 'You can only remove assignments from your own projects' })
    }

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

// Create day assignment (admin or project manager for their own projects)
router.post('/days', authenticate, requireAdminOrProjectManager, async (req: AuthRequest, res) => {
  try {
    const data = dayAssignmentSchema.parse(req.body)

    // Check project ownership via project assignment
    const projectId = await getProjectIdFromAssignment(data.projectAssignmentId)
    if (!projectId || !await canModifyProject(req.user!.userId, req.user!.role, projectId)) {
      return res.status(403).json({ error: 'You can only create day assignments for your own projects' })
    }

    // Check if this day assignment already exists (avoid duplicates)
    const existing = await db.query.dayAssignments.findFirst({
      where: (da, { and, eq }) => and(
        eq(da.projectAssignmentId, data.projectAssignmentId),
        eq(da.date, data.date)
      )
    })

    let dayAssignment
    if (existing) {
      // Day already exists, just return it (and still run merge logic below)
      dayAssignment = existing
    } else {
      // Create new day assignment
      const [created] = await db.insert(dayAssignments).values(data).returning()
      dayAssignment = created
    }

    // Handle potential group merges when adding a day
    const mergeResult = await handleGroupMergeOnDayAdd(data.projectAssignmentId, data.date)

    res.status(existing ? 200 : 201).json({
      ...dayAssignment,
      groupMerge: mergeResult.merged ? mergeResult : undefined
    })
  } catch (error) {
    console.error('Create day assignment error:', error)
    res.status(400).json({ error: 'Invalid request' })
  }
})

// Update day assignment (admin or project manager for their own projects)
router.put('/days/:id', authenticate, requireAdminOrProjectManager, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id)
    const { comment } = req.body

    // Get the day assignment to check ownership
    const dayAssignment = await db.query.dayAssignments.findFirst({
      where: (da, { eq }) => eq(da.id, id)
    })

    if (!dayAssignment) {
      return res.status(404).json({ error: 'Day assignment not found' })
    }

    // Check project ownership via project assignment
    const projectId = await getProjectIdFromAssignment(dayAssignment.projectAssignmentId)
    if (!projectId || !await canModifyProject(req.user!.userId, req.user!.role, projectId)) {
      return res.status(403).json({ error: 'You can only update day assignments for your own projects' })
    }

    const [updated] = await db
      .update(dayAssignments)
      .set({ comment })
      .where(eq(dayAssignments.id, id))
      .returning()

    res.json(updated)
  } catch (error) {
    console.error('Update day assignment error:', error)
    res.status(400).json({ error: 'Invalid request' })
  }
})

// Delete day assignment (admin or project manager for their own projects)
router.delete('/days/:id', authenticate, requireAdminOrProjectManager, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id)

    // Get the day assignment first so we know its date and projectAssignmentId
    const dayAssignment = await db.query.dayAssignments.findFirst({
      where: (da, { eq }) => eq(da.id, id)
    })

    if (!dayAssignment) {
      return res.status(404).json({ error: 'Day assignment not found' })
    }

    // Check project ownership via project assignment
    const projectId = await getProjectIdFromAssignment(dayAssignment.projectAssignmentId)
    if (!projectId || !await canModifyProject(req.user!.userId, req.user!.role, projectId)) {
      return res.status(403).json({ error: 'You can only delete day assignments for your own projects' })
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

// Create assignment group (admin or project manager for their own projects)
router.post('/groups', authenticate, requireAdminOrProjectManager, async (req: AuthRequest, res) => {
  try {
    const data = assignmentGroupSchema.parse(req.body)

    // Check project ownership via project assignment
    const projectId = await getProjectIdFromAssignment(data.projectAssignmentId)
    if (!projectId || !await canModifyProject(req.user!.userId, req.user!.role, projectId)) {
      return res.status(403).json({ error: 'You can only create assignment groups for your own projects' })
    }

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

// Update assignment group (admin or project manager for their own projects)
router.put('/groups/:id', authenticate, requireAdminOrProjectManager, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id)
    const data = updateAssignmentGroupSchema.parse(req.body)

    // Get the group to check ownership
    const group = await db.query.assignmentGroups.findFirst({
      where: (ag, { eq }) => eq(ag.id, id)
    })

    if (!group) {
      return res.status(404).json({ error: 'Assignment group not found' })
    }

    // Check project ownership via project assignment
    const projectId = await getProjectIdFromAssignment(group.projectAssignmentId)
    if (!projectId || !await canModifyProject(req.user!.userId, req.user!.role, projectId)) {
      return res.status(403).json({ error: 'You can only update assignment groups for your own projects' })
    }

    const updateData: { priority?: 'high' | 'normal' | 'low'; comment?: string | null } = {}
    if (data.priority !== undefined) updateData.priority = data.priority
    if (data.comment !== undefined) updateData.comment = data.comment

    const [updated] = await db
      .update(assignmentGroups)
      .set(updateData)
      .where(eq(assignmentGroups.id, id))
      .returning()

    res.json(updated)
  } catch (error) {
    console.error('Update assignment group error:', error)
    res.status(400).json({ error: 'Invalid request' })
  }
})

// Delete assignment group (admin or project manager for their own projects)
router.delete('/groups/:id', authenticate, requireAdminOrProjectManager, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id)

    // Get the group to check ownership
    const group = await db.query.assignmentGroups.findFirst({
      where: (ag, { eq }) => eq(ag.id, id)
    })

    if (!group) {
      return res.status(404).json({ error: 'Assignment group not found' })
    }

    // Check project ownership via project assignment
    const projectId = await getProjectIdFromAssignment(group.projectAssignmentId)
    if (!projectId || !await canModifyProject(req.user!.userId, req.user!.role, projectId)) {
      return res.status(403).json({ error: 'You can only delete assignment groups for your own projects' })
    }

    await db.delete(assignmentGroups).where(eq(assignmentGroups.id, id))
    res.status(204).send()
  } catch (error) {
    console.error('Delete assignment group error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
