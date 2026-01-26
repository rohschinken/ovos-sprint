import { Router } from 'express'
import { db, settings } from '../db/index.js'
import { validateSettingByKey } from '../utils/validation.js'
import { authenticate, AuthRequest } from '../middleware/auth.js'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const router = Router()

// Get user settings
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const userSettings = await db.query.settings.findMany({
      where: (settings, { eq }) => eq(settings.userId, userId),
    })

    // Convert to key-value object
    const settingsObj = userSettings.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string>)

    res.json(settingsObj)
  } catch (error) {
    console.error('Get settings error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get specific setting
router.get('/:key', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const key = req.params.key

    const setting = await db.query.settings.findFirst({
      where: (settings, { and, eq }) =>
        and(eq(settings.userId, userId), eq(settings.key, key)),
    })

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' })
    }

    res.json({ key: setting.key, value: setting.value })
  } catch (error) {
    console.error('Get setting error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Update or create setting
router.put('/:key', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const key = req.params.key

    // Use key-specific validation
    const validationSchema = validateSettingByKey(key)
    const { value } = validationSchema.parse({ key, value: req.body.value })

    // Check if setting exists
    const existing = await db.query.settings.findFirst({
      where: (settings, { and, eq }) =>
        and(eq(settings.userId, userId), eq(settings.key, key)),
    })

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(settings)
        .set({ value })
        .where(and(eq(settings.userId, userId), eq(settings.key, key)))
        .returning()

      res.json(updated)
    } else {
      // Create new
      const [created] = await db
        .insert(settings)
        .values({ userId, key, value })
        .returning()

      res.status(201).json(created)
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request',
        details: error.errors
      })
    }
    console.error('Update setting error:', error)
    res.status(400).json({ error: 'Invalid request' })
  }
})

// Delete setting
router.delete('/:key', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const key = req.params.key

    await db
      .delete(settings)
      .where(and(eq(settings.userId, userId), eq(settings.key, key)))

    res.status(204).send()
  } catch (error) {
    console.error('Delete setting error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
