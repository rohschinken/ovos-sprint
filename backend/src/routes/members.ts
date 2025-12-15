import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { db, teamMembers } from '../db/index.js'
import { teamMemberSchema } from '../utils/validation.js'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js'
import { eq } from 'drizzle-orm'

const router = Router()

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './data/avatars')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  },
})

// Get all team members
router.get('/', authenticate, async (req, res) => {
  try {
    const members = await db.query.teamMembers.findMany({
      orderBy: (teamMembers, { asc }) => [asc(teamMembers.lastName), asc(teamMembers.firstName)],
    })
    res.json(members)
  } catch (error) {
    console.error('Get members error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get team member by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const memberId = parseInt(req.params.id)
    const member = await db.query.teamMembers.findFirst({
      where: (teamMembers, { eq }) => eq(teamMembers.id, memberId),
    })

    if (!member) {
      return res.status(404).json({ error: 'Team member not found' })
    }

    res.json(member)
  } catch (error) {
    console.error('Get member error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Create team member (admin only)
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const data = teamMemberSchema.parse(req.body)
    const [member] = await db.insert(teamMembers).values(data).returning()
    res.status(201).json(member)
  } catch (error) {
    console.error('Create member error:', error)
    res.status(400).json({ error: 'Invalid request' })
  }
})

// Update team member (admin only)
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const memberId = parseInt(req.params.id)
    const data = teamMemberSchema.parse(req.body)

    const [updated] = await db
      .update(teamMembers)
      .set(data)
      .where(eq(teamMembers.id, memberId))
      .returning()

    if (!updated) {
      return res.status(404).json({ error: 'Team member not found' })
    }

    res.json(updated)
  } catch (error) {
    console.error('Update member error:', error)
    res.status(400).json({ error: 'Invalid request' })
  }
})

// Delete team member (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const memberId = parseInt(req.params.id)
    await db.delete(teamMembers).where(eq(teamMembers.id, memberId))
    res.status(204).send()
  } catch (error) {
    console.error('Delete member error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Upload avatar (admin only)
router.post('/:id/avatar', authenticate, requireAdmin, upload.single('avatar'), async (req: AuthRequest, res) => {
  try {
    const memberId = parseInt(req.params.id)

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // Construct full URL including backend server
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`
    const avatarUrl = `${backendUrl}/avatars/${req.file.filename}`

    const [updated] = await db
      .update(teamMembers)
      .set({ avatarUrl })
      .where(eq(teamMembers.id, memberId))
      .returning()

    if (!updated) {
      return res.status(404).json({ error: 'Team member not found' })
    }

    res.json(updated)
  } catch (error) {
    console.error('Upload avatar error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
