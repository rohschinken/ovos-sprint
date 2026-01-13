import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { db, users, settings, teamMembers } from '../db/index.js'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js'
import { updateUserRoleSchema } from '../utils/validation.js'

const router = Router()

// Get all users (admin only)
router.get('/', authenticate, requireAdmin, async (_req: AuthRequest, res) => {
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

// Update user role (admin only)
router.patch('/:id/role', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id)

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' })
    }

    // Parse and validate request body
    const { role } = updateUserRoleSchema.parse(req.body)

    // Prevent admin from changing their own role
    if (req.user && req.user.userId === userId) {
      return res.status(403).json({ error: 'You cannot change your own role' })
    }

    // Check if user exists
    const userToUpdate = await db.query.users.findFirst({
      where: eq(users.id, userId),
    })

    if (!userToUpdate) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Update user role
    const [updatedUser] = await db.update(users)
      .set({ role })
      .where(eq(users.id, userId))
      .returning()

    // Don't return password hash
    const { passwordHash, ...safeUser } = updatedUser

    res.json(safeUser)
  } catch (error) {
    console.error('Update user role error:', error)
    res.status(400).json({ error: 'Invalid request' })
  }
})

// Get cascade info for user deletion (admin only)
router.get('/:id/cascade-info', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id)

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' })
    }

    // Get user's settings
    const userSettings = await db.query.settings.findMany({
      where: eq(settings.userId, userId),
    })

    // Get team members linked to this user
    const linkedMembers = await db.query.teamMembers.findMany({
      where: eq(teamMembers.userId, userId),
    })

    res.json({
      settings: userSettings.length,
      linkedTeamMembers: linkedMembers.length,
    })
  } catch (error) {
    console.error('Get cascade info error:', error)
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
