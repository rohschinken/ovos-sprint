import { Router } from 'express'
import { db, milestones } from '../db/index.js'
import { authenticate, requireAdminOrProjectManager, AuthRequest } from '../middleware/auth.js'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const router = Router()

// Helper to check if user can modify a project (admin or project owner)
async function canModifyProject(userId: number, userRole: string, projectId: number): Promise<boolean> {
  if (userRole === 'admin') return true

  const project = await db.query.projects.findFirst({
    where: (projects, { eq }) => eq(projects.id, projectId),
  })

  return project?.managerId === userId
}

const milestoneSchema = z.object({
  projectId: z.number(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().optional(),
})

// Get all milestones (optionally filtered by project and date range)
router.get('/', authenticate, async (req, res) => {
  try {
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined
    const startDate = req.query.startDate as string | undefined
    const endDate = req.query.endDate as string | undefined

    let query = db.query.milestones.findMany({
      orderBy: (milestones, { asc }) => [asc(milestones.date)],
    })

    // Note: For filtering, we'll use the base query since Drizzle's query API
    // is more limited. We'll filter in-memory for now as this is simpler.
    const allMilestones = await query

    let filtered = allMilestones

    if (projectId !== undefined) {
      filtered = filtered.filter(m => m.projectId === projectId)
    }

    if (startDate) {
      filtered = filtered.filter(m => m.date >= startDate)
    }

    if (endDate) {
      filtered = filtered.filter(m => m.date <= endDate)
    }

    res.json(filtered)
  } catch (error) {
    console.error('Get milestones error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get milestone by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const milestoneId = parseInt(req.params.id)
    const milestone = await db.query.milestones.findFirst({
      where: (milestones, { eq }) => eq(milestones.id, milestoneId),
    })

    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' })
    }

    res.json(milestone)
  } catch (error) {
    console.error('Get milestone error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Create milestone (admin or project manager for their own projects)
router.post('/', authenticate, requireAdminOrProjectManager, async (req: AuthRequest, res) => {
  try {
    const data = milestoneSchema.parse(req.body)

    // Check if user can modify this project
    if (!await canModifyProject(req.user!.userId, req.user!.role, data.projectId)) {
      return res.status(403).json({ error: 'You can only create milestones for your own projects' })
    }

    const [milestone] = await db.insert(milestones).values(data).returning()
    res.status(201).json(milestone)
  } catch (error) {
    console.error('Create milestone error:', error)
    res.status(400).json({ error: 'Invalid request' })
  }
})

// Update milestone (admin or project manager for their own projects)
router.put('/:id', authenticate, requireAdminOrProjectManager, async (req: AuthRequest, res) => {
  try {
    const milestoneId = parseInt(req.params.id)
    const data = milestoneSchema.partial().parse(req.body)

    // Get the milestone to check project ownership
    const existingMilestone = await db.query.milestones.findFirst({
      where: (m, { eq }) => eq(m.id, milestoneId),
    })

    if (!existingMilestone) {
      return res.status(404).json({ error: 'Milestone not found' })
    }

    // Check if user can modify this project
    if (!await canModifyProject(req.user!.userId, req.user!.role, existingMilestone.projectId)) {
      return res.status(403).json({ error: 'You can only update milestones for your own projects' })
    }

    const [updated] = await db
      .update(milestones)
      .set(data)
      .where(eq(milestones.id, milestoneId))
      .returning()

    res.json(updated)
  } catch (error) {
    console.error('Update milestone error:', error)
    res.status(400).json({ error: 'Invalid request' })
  }
})

// Delete milestone (admin or project manager for their own projects)
router.delete('/:id', authenticate, requireAdminOrProjectManager, async (req: AuthRequest, res) => {
  try {
    const milestoneId = parseInt(req.params.id)

    // Get the milestone to check project ownership
    const existingMilestone = await db.query.milestones.findFirst({
      where: (m, { eq }) => eq(m.id, milestoneId),
    })

    if (!existingMilestone) {
      return res.status(404).json({ error: 'Milestone not found' })
    }

    // Check if user can modify this project
    if (!await canModifyProject(req.user!.userId, req.user!.role, existingMilestone.projectId)) {
      return res.status(403).json({ error: 'You can only delete milestones for your own projects' })
    }

    await db.delete(milestones).where(eq(milestones.id, milestoneId))
    res.status(204).send()
  } catch (error) {
    console.error('Delete milestone error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
