import { Router } from 'express'
import { db, users } from '../db/index.js'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js'

const router = Router()

// Get all users (admin only)
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const allUsers = await db.query.users.findMany({
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    })

    // Don't return password hashes
    const safeUsers = allUsers.map(({ passwordHash, ...user }) => user)

    res.json(safeUsers)
  } catch (error) {
    console.error('Get users error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
