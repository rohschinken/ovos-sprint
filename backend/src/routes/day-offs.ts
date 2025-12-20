import { Router } from 'express'
import { db, dayOffs, dayAssignments, projectAssignments } from '../db/index.js'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const router = Router()

const dayOffSchema = z.object({
  teamMemberId: z.number(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

// Get all day-offs (filtered by date range)
router.get('/', authenticate, async (req, res) => {
  try {
    const startDate = req.query.startDate as string | undefined
    const endDate = req.query.endDate as string | undefined

    const allDayOffs = await db.query.dayOffs.findMany({
      orderBy: (dayOffs, { asc }) => [asc(dayOffs.date)],
    })

    let filtered = allDayOffs

    if (startDate) {
      filtered = filtered.filter(d => d.date >= startDate)
    }

    if (endDate) {
      filtered = filtered.filter(d => d.date <= endDate)
    }

    res.json(filtered)
  } catch (error) {
    console.error('Get day-offs error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Create day-off (admin only)
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const data = dayOffSchema.parse(req.body)

    // First, delete all day assignments for this member on this date
    // Get all project assignments for this member
    const memberProjectAssignments = await db
      .select()
      .from(projectAssignments)
      .where(eq(projectAssignments.teamMemberId, data.teamMemberId))

    const projectAssignmentIds = memberProjectAssignments.map(pa => pa.id)

    // Delete all day assignments for these project assignments on this date
    if (projectAssignmentIds.length > 0) {
      for (const paId of projectAssignmentIds) {
        await db
          .delete(dayAssignments)
          .where(
            and(
              eq(dayAssignments.date, data.date),
              eq(dayAssignments.projectAssignmentId, paId)
            )
          )
      }
    }

    // Now create the day-off
    const [dayOff] = await db.insert(dayOffs).values(data).returning()
    res.status(201).json(dayOff)
  } catch (error) {
    console.error('Create day-off error:', error)
    res.status(400).json({ error: 'Invalid request' })
  }
})

// Delete day-off (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const dayOffId = parseInt(req.params.id)
    await db.delete(dayOffs).where(eq(dayOffs.id, dayOffId))
    res.status(204).send()
  } catch (error) {
    console.error('Delete day-off error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
