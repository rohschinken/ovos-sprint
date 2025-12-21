import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { db, users, invitations, teamMembers } from '../db/index.js'
import { generateToken } from '../utils/jwt.js'
import { loginSchema, registerSchema, inviteSchema } from '../utils/validation.js'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js'
import { eq } from 'drizzle-orm'
import { emailService } from '../services/email/emailService.js'

const router = Router()

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body)

    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    })

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(400).json({ error: 'Invalid request' })
  }
})

// Register (complete invitation)
router.post('/register', async (req, res) => {
  try {
    const { email, password, token } = registerSchema.parse(req.body)

    // Verify invitation
    const invitation = await db.query.invitations.findFirst({
      where: (invitations, { and, eq, isNull }) =>
        and(
          eq(invitations.email, email),
          eq(invitations.token, token),
          isNull(invitations.usedAt)
        ),
    })

    if (!invitation) {
      return res.status(400).json({ error: 'Invalid invitation' })
    }

    // Check if invitation expired
    if (new Date(invitation.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'Invitation expired' })
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    })

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' })
    }

    // Create user with role from invitation
    const passwordHash = await bcrypt.hash(password, 10)
    const [newUser] = await db.insert(users).values({
      email,
      passwordHash,
      role: (invitation.role as 'admin' | 'user') || 'user',
    }).returning()

    // Mark invitation as used
    await db.update(invitations)
      .set({ usedAt: new Date().toISOString() })
      .where(eq(invitations.id, invitation.id))

    // Link user to member if member exists with this email
    const member = await db.query.teamMembers.findFirst({
      where: eq(teamMembers.email, email),
    })

    if (member) {
      await db.update(teamMembers)
        .set({ userId: newUser.id })
        .where(eq(teamMembers.id, member.id))
    }

    const authToken = generateToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    })

    res.json({
      token: authToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(400).json({ error: 'Invalid request' })
  }
})

// Invite user (admin only)
router.post('/invite', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { email, role } = inviteSchema.parse(req.body)

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    })

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' })
    }

    // Create invitation
    const token = uuidv4()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Expires in 7 days

    const [invitation] = await db.insert(invitations).values({
      email,
      role,
      token,
      expiresAt: expiresAt.toISOString(),
    }).returning()

    // Send invitation email
    const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?token=${token}&email=${encodeURIComponent(email)}`

    const inviterUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, req.user!.userId),
    })

    const inviterName = inviterUser?.email || 'Admin'

    // Send email
    await emailService.sendUserInvite(email, {
      inviterName,
      inviteLink: invitationLink,
      expiresInDays: 7,
      role: role as 'admin' | 'user',
    })

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📧 Invitation sent to:', email)
    console.log('🔗 Invitation link:', invitationLink)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    res.json({
      message: 'Invitation sent successfully',
      invitationLink,
    })
  } catch (error) {
    console.error('Invite error:', error)
    res.status(400).json({ error: 'Invalid request' })
  }
})

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, req.user!.userId),
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    })
  } catch (error) {
    console.error('Get me error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
