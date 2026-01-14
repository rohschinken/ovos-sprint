# OVOS Sprint - Architecture Documentation

## Security Features

- **JWT-based authentication** - Secure token-based authentication system
- **Secure password hashing** - bcrypt hashing for password storage
- **Role-based access control (RBAC)** - Admin, Project Manager, and User roles with different permissions
- **CORS protection** - Configured allowed origins for frontend-backend communication
- **Helmet security headers** - HTTP security headers to protect against common vulnerabilities
- **SQL injection prevention** - Drizzle ORM with parameterized queries
- **Invitation-based user registration** - Users can only register with valid invitation tokens
- **Session management** - JWT token expiration and refresh mechanisms

## Project Structure

```
ovos-sprint/
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── api/          # API client configuration
│   │   ├── components/   # React components
│   │   │   └── ui/       # shadcn/ui components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utility functions
│   │   ├── pages/        # Page components
│   │   ├── store/        # Zustand stores
│   │   ├── styles/       # Global styles
│   │   └── types/        # TypeScript type definitions
│   ├── package.json
│   └── vite.config.ts
├── backend/               # Express backend application
│   ├── src/
│   │   ├── db/           # Database schema and migrations
│   │   ├── middleware/   # Express middleware
│   │   ├── routes/       # API route handlers
│   │   ├── services/     # Business logic services
│   │   │   └── email/    # Email service and templates
│   │   │       ├── emailService.ts    # Email sending service
│   │   │       ├── types.ts           # Email type definitions
│   │   │       └── templates/         # React Email templates
│   │   │           ├── TeamInviteEmail.tsx
│   │   │           ├── UserInviteEmail.tsx
│   │   │           └── PasswordResetEmail.tsx
│   │   ├── utils/        # Utility functions
│   │   ├── websocket/    # WebSocket setup
│   │   └── index.ts      # Application entry point
│   ├── package.json
│   └── drizzle.config.ts
├── data/                  # SQLite database and uploads
│   └── avatars/          # User avatar uploads
├── docker-compose.yml     # Docker Compose configuration
├── Caddyfile             # Caddy reverse proxy config
└── README.md             # Project overview
```

## API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Complete invitation registration
- `POST /api/auth/invite` - Invite new user (admin only)
- `GET /api/auth/me` - Get current user

### Teams

- `GET /api/teams` - List all teams
- `GET /api/teams/:id` - Get team details
- `POST /api/teams` - Create team (admin only)
- `PUT /api/teams/:id` - Update team (admin only)
- `DELETE /api/teams/:id` - Delete team (admin only)

### Team Members

- `GET /api/members` - List all members
- `GET /api/members/:id` - Get member details
- `POST /api/members` - Create member (admin only)
- `PUT /api/members/:id` - Update member (admin only)
- `DELETE /api/members/:id` - Delete member (admin only)
- `POST /api/members/:id/avatar` - Upload avatar (admin only)

### Projects

- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Create project (admin only)
- `PUT /api/projects/:id` - Update project (admin only)
- `DELETE /api/projects/:id` - Delete project (admin only)

### Assignments

- `GET /api/assignments/projects` - List project assignments
- `GET /api/assignments/projects/:projectId` - Get assignments for project
- `GET /api/assignments/members/:memberId` - Get assignments for member
- `POST /api/assignments/projects` - Create project assignment (admin only)
- `DELETE /api/assignments/projects/:id` - Delete assignment (admin only)
- `GET /api/assignments/days` - List day assignments
- `POST /api/assignments/days` - Create day assignment (admin only)
- `PUT /api/assignments/days/:id` - Update day assignment (admin only)
- `DELETE /api/assignments/days/:id` - Delete day assignment (admin only)

### Settings

- `GET /api/settings` - Get user settings
- `GET /api/settings/:key` - Get specific setting
- `PUT /api/settings/:key` - Update setting
- `DELETE /api/settings/:key` - Delete setting

## Technology Stack

### Frontend

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: React Router v6
- **Date Handling**: date-fns
- **Real-Time**: Socket.IO Client
- **Icons**: Lucide React
- **Animations**: Framer Motion

### Backend

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: SQLite
- **ORM**: Drizzle ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Real-Time**: Socket.IO
- **Validation**: Zod
- **File Uploads**: Multer
- **Image Processing**: Sharp
- **Email**: Nodemailer with React Email templates
- **Security**: Helmet, CORS

### DevOps & Infrastructure

- **Containerization**: Docker
- **Reverse Proxy**: Caddy (development), Apache/nginx (production)
- **Orchestration**: Docker Compose
- **Database Migrations**: Drizzle Kit
- **Email Testing**: Mailpit (development SMTP server)

## Architecture Overview

### Frontend Architecture

The frontend is a **Single Page Application (SPA)** built with React:

- **Client-side routing**: React Router handles navigation
- **State management**:
  - Zustand for auth state (persisted to localStorage)
  - React Query for server state (API data with caching)
- **Real-time updates**: WebSocket via Socket.IO for live data synchronization
- **Component structure**:
  - Pages: Top-level route components
  - Components: Reusable UI components
  - UI: shadcn/ui component library
- **API communication**: Axios client with interceptors for auth and error handling

### Backend Architecture

The backend is a **REST API** with real-time capabilities:

- **Express.js server**: HTTP API endpoints
- **Socket.IO**: WebSocket server for real-time updates
- **Drizzle ORM**: Type-safe database queries
- **Middleware stack**:
  - CORS: Cross-origin request handling
  - Helmet: Security headers
  - JWT verification: Protected route authentication
  - Zod validation: Request/response validation
- **Service layer**: Business logic separated from route handlers
- **Email service**: React Email templates rendered server-side

### Database Schema

**SQLite** database with 12+ tables:

- `users` - User accounts with roles (admin, project_manager, user)
- `teams` - Team definitions
- `customers` - Customer/client information
- `projects` - Projects with status (confirmed, tentative)
- `teamMembers` - Individual team members
- `teamTeamMembers` - Many-to-many: teams ↔ members
- `projectAssignments` - Many-to-many: projects ↔ members
- `dayAssignments` - Day-by-day workload assignments
- `dayOffs` - Holidays and time off
- `milestones` - Project milestones
- `invitations` - User invitation tokens
- `settings` - User-specific settings

### Real-Time Communication

**Socket.IO** provides bidirectional communication:

- **Events emitted by backend**:
  - `project:created`, `project:updated`, `project:deleted`
  - `member:created`, `member:updated`, `member:deleted`
  - `assignment:created`, `assignment:updated`, `assignment:deleted`
  - etc.
- **Authentication**: JWT token validated on WebSocket connection
- **Room-based broadcasting**: Updates sent to all connected clients
- **Fallback support**: HTTP long-polling if WebSocket unavailable

### Production Deployment Architecture

```
[Users] → Port 80/443 (HTTP/HTTPS)
    ↓
[Apache/nginx Reverse Proxy]
    ├─→ Frontend: Serve static files from frontend/dist/
    └─→ Backend API: Proxy to localhost:3001
           ├─→ /api/* → REST API endpoints
           ├─→ /socket.io/* → WebSocket (WSS upgrade)
           ├─→ /avatars/* → Static avatar files
           └─→ /health → Health check endpoint
```

**Port Strategy**:
- Users access standard ports (80 for HTTP, 443 for HTTPS)
- Apache/nginx listens on 80/443 (public-facing)
- Backend Node.js runs on localhost:3001 (not publicly accessible)
- WebSocket upgrades from HTTPS to WSS (secure WebSocket)

## Data Flow

### User Authentication Flow

1. User submits login credentials
2. Backend validates credentials and generates JWT token
3. Token stored in frontend localStorage
4. Subsequent API requests include JWT in Authorization header
5. Backend middleware verifies JWT for protected routes
6. WebSocket connection authenticates using same JWT

### Resource Assignment Flow

1. Admin assigns team member to project (general assignment)
2. Admin drags across timeline to create day-specific assignments
3. Backend validates assignment (no overlaps, weekend warnings)
4. Assignment saved to database
5. Socket.IO broadcasts update to all connected clients
6. All clients update their local state via React Query cache invalidation
7. Timeline UI re-renders with new assignment

### Email Invitation Flow

1. Admin creates invitation via UI
2. Backend generates unique token and stores in database
3. Email service renders React Email template
4. Nodemailer sends email via SMTP (Mailpit dev, SparkPost prod)
5. User clicks link with token
6. Registration page validates token
7. User completes registration
8. Account created and invitation marked as used
