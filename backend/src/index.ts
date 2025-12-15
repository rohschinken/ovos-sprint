import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

import authRoutes from './routes/auth.js'
import usersRoutes from './routes/users.js'
import teamsRoutes from './routes/teams.js'
import membersRoutes from './routes/members.js'
import projectsRoutes from './routes/projects.js'
import assignmentsRoutes from './routes/assignments.js'
import settingsRoutes from './routes/settings.js'
import { setupWebSocket } from './websocket/index.js'

// Load environment variables
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const httpServer = createServer(app)

// Setup WebSocket
export const io = setupWebSocket(httpServer)

// Middleware
app.use(helmet())
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
app.use('/api/members', membersRoutes)
app.use('/api/projects', projectsRoutes)
app.use('/api/assignments', assignmentsRoutes)
app.use('/api/settings', settingsRoutes)

// Health check
app.get('/health', (req, res) => {
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
  console.log('🚀 ovos Sprint Backend Server')
  console.log(`📡 Server running on port ${PORT}`)
  console.log(`🔌 WebSocket server ready`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
})

export default app
