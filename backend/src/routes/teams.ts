import { Router } from 'express'
import { db, teams, teamMembers, teamTeamMembers } from '../db/index.js'
import { teamSchema } from '../utils/validation.js'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js'
import { eq, and, inArray } from 'drizzle-orm'

const router = Router()

// Get all teams
router.get('/', authenticate, async (_req, res) => {
  try {
    const allTeams = await db.query.teams.findMany({
      orderBy: (teams, { desc }) => [desc(teams.createdAt)],
    })
    res.json(allTeams)
  } catch (error) {
    console.error('Get teams error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get all team-member relationships
router.get('/members/relationships', authenticate, async (_req, res) => {
  try {
    const relationships = await db.select().from(teamTeamMembers)
    res.json(relationships)
  } catch (error) {
    console.error('Get team-member relationships error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get cascade info for team deletion (admin only)
// MUST be before /:id route to avoid matching "cascade-info" as an ID
router.get('/:id/cascade-info', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id)

    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID' })
    }

    // Get team member links
    const teamLinks = await db.query.teamTeamMembers.findMany({
      where: eq(teamTeamMembers.teamId, teamId),
    })

    res.json({
      memberLinks: teamLinks.length,
    })
  } catch (error) {
    console.error('Get cascade info error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get team by ID with members
router.get('/:id', authenticate, async (req, res) => {
  try {
    const teamId = parseInt(req.params.id)
    const team = await db.query.teams.findFirst({
      where: (teams, { eq }) => eq(teams.id, teamId),
    })

    if (!team) {
      return res.status(404).json({ error: 'Team not found' })
    }

    // Get team members
    const members = await db
      .select({ member: teamMembers })
      .from(teamTeamMembers)
      .where(eq(teamTeamMembers.teamId, teamId))
      .leftJoin(teamMembers, eq(teamTeamMembers.teamMemberId, teamMembers.id))
      .then(results => results.map(r => r.member).filter(Boolean))

    res.json({ ...team, members })
  } catch (error) {
    console.error('Get team error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Create team (admin only)
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const data = teamSchema.parse(req.body)
    const [team] = await db.insert(teams).values(data).returning()
    res.status(201).json(team)
  } catch (error) {
    console.error('Create team error:', error)
    res.status(400).json({ error: 'Invalid request' })
  }
})

// Update team (admin only)
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id)
    const data = teamSchema.parse(req.body)

    const [updated] = await db
      .update(teams)
      .set(data)
      .where(eq(teams.id, teamId))
      .returning()

    if (!updated) {
      return res.status(404).json({ error: 'Team not found' })
    }

    res.json(updated)
  } catch (error) {
    console.error('Update team error:', error)
    res.status(400).json({ error: 'Invalid request' })
  }
})

// Delete team (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id)
    await db.delete(teams).where(eq(teams.id, teamId))
    res.status(204).send()
  } catch (error) {
    console.error('Delete team error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Batch add multiple members to a team (admin only) - MUST come before /:id/members/:memberId
router.post('/:id/members/batch', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id)
    const data = req.body as { memberIds: number[] }

    if (!Array.isArray(data.memberIds)) {
      return res.status(400).json({ error: 'Invalid request: memberIds array required' })
    }

    // Verify team exists
    const team = await db.query.teams.findFirst({
      where: (teams, { eq }) => eq(teams.id, teamId)
    })

    if (!team) {
      return res.status(404).json({ error: 'Team not found' })
    }

    // Verify all members exist
    const members = await db.query.teamMembers.findMany({
      where: (teamMembers, { inArray }) => inArray(teamMembers.id, data.memberIds)
    })

    if (members.length !== data.memberIds.length) {
      return res.status(404).json({ error: 'Some members not found' })
    }

    // Get existing relationships to avoid duplicates
    const existing = await db.query.teamTeamMembers.findMany({
      where: (ttm, { eq }) => eq(ttm.teamId, teamId)
    })
    const existingIds = new Set(existing.map(e => e.teamMemberId))

    // Filter to only new members
    const newMemberIds = data.memberIds.filter(id => !existingIds.has(id))

    // Insert new relationships
    if (newMemberIds.length > 0) {
      await db.insert(teamTeamMembers).values(
        newMemberIds.map(memberId => ({
          teamId,
          teamMemberId: memberId
        }))
      )
    }

    res.status(201).json({
      added: newMemberIds.length,
      skipped: data.memberIds.length - newMemberIds.length
    })
  } catch (error) {
    console.error('Batch add members to team error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Batch remove multiple members from a team (admin only) - MUST come before /:id/members/:memberId
router.delete('/:id/members/batch', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id)
    const data = req.body as { memberIds: number[] }

    if (!Array.isArray(data.memberIds)) {
      return res.status(400).json({ error: 'Invalid request: memberIds array required' })
    }

    // Delete all specified relationships
    await db.delete(teamTeamMembers).where(
      and(
        eq(teamTeamMembers.teamId, teamId),
        inArray(teamTeamMembers.teamMemberId, data.memberIds)
      )
    )

    res.status(204).send()
  } catch (error) {
    console.error('Batch remove members from team error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Add member to team (admin only)
router.post('/:id/members/:memberId', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id)
    const memberId = parseInt(req.params.memberId)

    await db.insert(teamTeamMembers).values({
      teamId,
      teamMemberId: memberId,
    })

    res.status(201).json({ message: 'Member added to team' })
  } catch (error) {
    console.error('Add member to team error:', error)
    res.status(400).json({ error: 'Invalid request' })
  }
})

// Remove member from team (admin only)
router.delete('/:id/members/:memberId', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id)
    const memberId = parseInt(req.params.memberId)

    await db
      .delete(teamTeamMembers)
      .where(and(eq(teamTeamMembers.teamId, teamId), eq(teamTeamMembers.teamMemberId, memberId)))

    res.status(204).send()
  } catch (error) {
    console.error('Remove member from team error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
