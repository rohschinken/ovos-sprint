import { Router } from 'express'
import { eq } from 'drizzle-orm'
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

// Delete user (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id)

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' })
    }

    // Prevent admin from deleting themselves
    if (req.user && req.user.userId === userId) {
      return res.status(403).json({ error: 'You cannot delete your own account' })
    }

    // Check if user exists
    const userToDelete = await db.query.users.findFirst({
      where: eq(users.id, userId),
    })

    if (!userToDelete) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Delete user (cascades will handle related records)
    await db.delete(users).where(eq(users.id, userId))

    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Delete user error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
