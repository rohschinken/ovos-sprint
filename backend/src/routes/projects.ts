import { Router } from 'express'
import { db, projects } from '../db/index.js'
import { projectSchema } from '../utils/validation.js'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js'
import { eq } from 'drizzle-orm'

const router = Router()

// Get all projects
router.get('/', authenticate, async (req, res) => {
  try {
    const allProjects = await db.query.projects.findMany({
      orderBy: (projects, { desc }) => [desc(projects.createdAt)],
    })
    res.json(allProjects)
  } catch (error) {
    console.error('Get projects error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get project by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id)
    const project = await db.query.projects.findFirst({
      where: (projects, { eq }) => eq(projects.id, projectId),
    })

    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    res.json(project)
  } catch (error) {
    console.error('Get project error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Create project (admin only)
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const data = projectSchema.parse(req.body)
    const [project] = await db.insert(projects).values(data).returning()
    res.status(201).json(project)
  } catch (error) {
    console.error('Create project error:', error)
    res.status(400).json({ error: 'Invalid request' })
  }
})

// Update project (admin only)
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const projectId = parseInt(req.params.id)
    const data = projectSchema.parse(req.body)

    const [updated] = await db
      .update(projects)
      .set(data)
      .where(eq(projects.id, projectId))
      .returning()

    if (!updated) {
      return res.status(404).json({ error: 'Project not found' })
    }

    res.json(updated)
  } catch (error) {
    console.error('Update project error:', error)
    res.status(400).json({ error: 'Invalid request' })
  }
})

// Delete project (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const projectId = parseInt(req.params.id)
    await db.delete(projects).where(eq(projects.id, projectId))
    res.status(204).send()
  } catch (error) {
    console.error('Delete project error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
