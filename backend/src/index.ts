import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { mkdirSync } from 'fs'

import authRoutes from './routes/auth.js'
import usersRoutes from './routes/users.js'
import teamsRoutes from './routes/teams.js'
import customersRoutes from './routes/customers.js'
import membersRoutes from './routes/members.js'
import projectsRoutes from './routes/projects.js'
import assignmentsRoutes from './routes/assignments.js'
import settingsRoutes from './routes/settings.js'
import milestonesRoutes from './routes/milestones.js'
import dayOffsRoutes from './routes/day-offs.js'
import { setupWebSocket } from './websocket/index.js'
import { emailService } from './services/email/emailService.js'

// Load environment variables
dotenv.config()

// Environment validation for production
function validateEnvironment() {
  const isProduction = process.env.NODE_ENV === 'production'
  const errors: string[] = []
  const warnings: string[] = []

  // Critical in production
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key-change-in-production') {
    if (isProduction) {
      errors.push('JWT_SECRET must be set to a secure value in production')
    } else {
      warnings.push('JWT_SECRET is using default value - change this for production')
    }
  }

  if (!process.env.FRONTEND_URL) {
    if (isProduction) {
      errors.push('FRONTEND_URL must be set in production')
    } else {
      warnings.push('FRONTEND_URL not set - using default http://localhost:5173')
    }
  }

  if (!process.env.BACKEND_URL) {
    if (isProduction) {
      errors.push('BACKEND_URL must be set in production (used for avatar URLs)')
    } else {
      warnings.push('BACKEND_URL not set - using default http://localhost:3001')
    }
  }

  // Print warnings
  if (warnings.length > 0) {
    console.log('⚠️  Environment warnings:')
    warnings.forEach(w => console.log(`   - ${w}`))
  }

  // Fail fast on errors
  if (errors.length > 0) {
    console.error('❌ Environment validation failed:')
    errors.forEach(e => console.error(`   - ${e}`))
    process.exit(1)
  }
}

validateEnvironment()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Ensure required directories exist
const avatarsDir = path.join(__dirname, '../data/avatars')
mkdirSync(avatarsDir, { recursive: true })

const app = express()
const httpServer = createServer(app)

// Setup WebSocket
export const io = setupWebSocket(httpServer)

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}))
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve static files (avatars)
app.use('/avatars', express.static(path.join(__dirname, '../data/avatars')))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/teams', teamsRoutes)
app.use('/api/customers', customersRoutes)
app.use('/api/members', membersRoutes)
app.use('/api/projects', projectsRoutes)
app.use('/api/assignments', assignmentsRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/milestones', milestonesRoutes)
app.use('/api/day-offs', dayOffsRoutes)

// Test email endpoint (development only)
if (process.env.NODE_ENV === 'development') {
  app.post('/api/test/email', async (req, res) => {
    const { type, email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' })
    }

    try {
      let result = false

      switch (type) {
        case 'team-invite':
          result = await emailService.sendTeamInvite(email, {
            teamMemberName: 'John Doe',
            inviterName: 'Jane Admin',
            inviteLink: `http://localhost:3000/register?token=test123&email=${encodeURIComponent(email)}`,
            expiresInDays: 7,
          })
          break

        case 'user-invite':
          result = await emailService.sendUserInvite(email, {
            inviterName: 'Jane Admin',
            inviteLink: `http://localhost:3000/register?token=test456&email=${encodeURIComponent(email)}`,
            expiresInDays: 7,
            role: 'user',
          })
          break

        case 'password-reset':
          result = await emailService.sendPasswordReset(email, {
            userName: 'John Doe',
            resetLink: 'http://localhost:3000/reset-password?token=test789',
            expiresInHours: 24,
          })
          break

        default:
          result = await emailService.sendTestEmail(email)
      }

      res.json({ success: result, message: result ? 'Email sent successfully' : 'Failed to send email' })
    } catch (error) {
      console.error('Test email error:', error)
      res.status(500).json({ error: 'Failed to send test email' })
    }
  })
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  })
})

// Start server
const PORT = process.env.PORT || 3001

httpServer.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🚀 ovos Sprint 🏃‍♂️‍➡️ Backend Server')
  console.log(`📡 Server running on port ${PORT}`)
  console.log(`🔌 WebSocket server ready`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
})

export default app
