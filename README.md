# ovos Sprint 🏃‍♂️‍➡️

Workload management and resource planning tool for IT project managers.

![ovos Sprint 🏃‍♂️‍➡️](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Features

### Role-Based Access Control
- Admin role with full CRUD permissions
- User role with read-only access
- Invitation-based registration

### Team & Resource Management
- Create and manage teams
- Team members with customizable avatars
- Resource allocation across projects

### Project Management
- Projects with customer information
- Confirmed and tentative status types
- Many-to-many relationships between team members and projects

### Timeline View
- View by project or by team member
- Configurable zoom levels
- Day-by-day workload visualization
- Weekend and holiday highlighting
- Expandable/collapsible rows
- User preference persistence

### Drag-to-Assign (Admin Only)
- Click-and-drag interface for day assignments
- Multi-day selection
- Right-click or CTRL+click to delete
- Weekend/holiday assignment warnings

### Real-Time Updates
- WebSocket-based synchronization
- Instant updates across users

### UI Features
- Dark mode support
- Responsive layout
- Framer Motion animations

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
- **Reverse Proxy**: Caddy
- **Orchestration**: Docker Compose
- **Database Migrations**: Drizzle Kit
- **Email Testing**: Mailpit (development SMTP server)

## Prerequisites

- **Node.js**: v20.x or higher
- **Docker**: Latest version
- **Docker Compose**: Latest version
- **npm**: v10.x or higher

## Quick Start

### Option 1: Development Mode (Recommended for Development)

```bash
# 1. Clone the repository
git clone https://github.com/rohschinken/ovos-sprint.git
cd ovos-sprint

# 2. Install all dependencies (root, backend, and frontend)
npm run install:all

# 3. Set up database (first time only)
npm run db:setup

# 4. Run both frontend and backend
npm run dev
```

**Important**: The database setup will prompt you to enter an admin email and output the generated password. **Save these securely!**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email: admin@example.com
Password: [generated-password]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  Please save this password securely!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

The application will be available at:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **WebSocket**: ws://localhost:3001

### Option 2: Docker Compose (Recommended for Consistency)

Docker Compose provides a consistent development environment with all services pre-configured, including email testing with Mailpit.

```bash
# 1. Clone the repository
git clone https://github.com/rohschinken/ovos-sprint.git
cd ovos-sprint

# 2. Build and start all services
docker compose up --build -d

# 3. Initialize the database (first time only)
docker compose exec backend sh -c "echo 'y' | npm run db:push"

# 4. Seed the database with admin user
docker compose exec backend sh -c "echo -e 'admin@example.com\npassword' | npm run db:seed"
```

**Important**: The seed command will output your admin credentials. Save them securely!

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email: admin@example.com
Password: [randomly-generated-password]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  Please save this password securely!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

The application will be available at:

- **Frontend**: http://localhost:3000 (via Caddy reverse proxy)
- **Backend API**: http://localhost:3001 (via Caddy reverse proxy)
- **WebSocket**: ws://localhost:3001
- **Mailpit Web UI**: http://localhost:8025 (email testing interface)

#### Docker Services

The Docker Compose setup includes:

- **Frontend** (React + Vite) - Port 3000
- **Backend** (Node.js + Express) - Port 3001
- **Caddy** - Reverse proxy for both frontend and backend
- **Mailpit** - SMTP server and web UI for email testing (ports 1025, 8025)

#### Rebuilding After Changes

If you modify the Docker configuration or want to start fresh:

```bash
# Stop and remove all containers
docker compose down

# Remove the database (optional - only if you want to reset data)
rm -rf data/ovos-sprint.db*

# Rebuild and restart
docker compose up --build -d

# Re-initialize database
docker compose exec backend sh -c "echo 'y' | npm run db:push"
docker compose exec backend sh -c "echo -e 'admin@example.com\npassword' | npm run db:seed"
```

#### Viewing Logs

```bash
# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mailpit
```

#### Troubleshooting Docker Setup

If you encounter issues with native modules (like better-sqlite3):

```bash
# Rebuild native modules inside the container
docker compose exec backend npm rebuild better-sqlite3
docker compose restart backend
```

### Environment Configuration (Optional)

If you need custom configuration, create a `.env` file in the `backend` directory:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your configuration:

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=./data/ovos-sprint.db
JWT_SECRET=your-secure-secret-key-here
FRONTEND_URL=http://localhost:3000

# Email Configuration (Mailpit for development)
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_FROM_EMAIL=noreply@ovos-sprint.local
SMTP_FROM_NAME=OVOS Sprint
```

**Note**: When using Docker Compose, these environment variables are already configured in `docker-compose.yml`.

## Email Testing with Mailpit

The Docker Compose setup includes Mailpit, a local SMTP server with a web UI for testing emails without sending real emails.

### Accessing Mailpit

- **Web UI**: <http://localhost:8025>
- **SMTP Server**: localhost:1025 (used by the backend)

### Testing Email Functionality

The backend includes a test endpoint for sending sample emails:

```bash
# Test team member invitation email
curl -X POST http://localhost:3001/api/test/email \
  -H "Content-Type: application/json" \
  -d '{"type": "team-invite", "email": "test@example.com"}'

# Test user invitation email
curl -X POST http://localhost:3001/api/test/email \
  -H "Content-Type: application/json" \
  -d '{"type": "user-invite", "email": "test@example.com"}'

# Test password reset email
curl -X POST http://localhost:3001/api/test/email \
  -H "Content-Type: application/json" \
  -d '{"type": "password-reset", "email": "test@example.com"}'

# Test basic email
curl -X POST http://localhost:3001/api/test/email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

All sent emails will appear instantly in the Mailpit web UI at <http://localhost:8025>.

### Email Templates

The application includes three professionally designed email templates built with React Email:

- **Team Member Invitations** - Blue CTA button for team member onboarding
- **User Invitations** - Blue CTA button for general user onboarding
- **Password Reset** - Red CTA button for security emphasis

Templates are located in `backend/src/services/email/templates/`.

## Admin Account

During the database seeding process (`npm run db:setup` or Docker setup), you will be prompted to enter an admin email address. Use that email and the generated password to log in:

- **Email**: _(enter during seed process)_
- **Password**: _(displayed in console output from seed command)_

## User Guide

### For Admins

#### Inviting Users

1. Navigate to the admin dashboard
2. Use the invite function to send invitation links
3. Invitation links are displayed in the console (email integration pending)
4. Share the link with the user

#### Creating Teams

1. Go to Teams page
2. Click Create Team
3. Enter team name
4. Add members to the team

#### Managing Team Members

1. Go to Team Members page
2. Click Add Member
3. Enter first name and last name
4. Avatar will be auto-generated (custom upload available)

#### Creating Projects

1. Go to Projects page
2. Click Create Project
3. Enter customer name and project name
4. Select status (Confirmed/Tentative)

#### Assigning Team Members to Projects

1. In the timeline view, expand a project (By Project mode)
2. You'll see all team members assigned to that project
3. First, create a general assignment between member and project
4. Then drag across days to create day-specific assignments

#### Day-by-Day Assignment

1. Click and hold on a day cell
2. Drag across multiple days if needed
3. Release to create the assignment
4. Assignments will show with color coding based on project status
5. Weekend/holiday warnings will appear if enabled

### For Users (Read-Only)

- View the timeline in both modes
- See current workload distribution
- Check project assignments
- View project statuses

## Configuration

### Timeline Settings

Configure in Settings page:

- **Previous Days**: How many days before today to show (default: 1)
- **Next Days**: How many days after today to show (default: 30)

### Assignment Settings

- **Weekend Assignment Warning**: Enable/disable warnings when assigning work on weekends or holidays
- **Overlap Visualization**: Enable/disable highlighting when team members have multiple assignments on the same day

## Austrian Holidays

The following Austrian federal holidays are automatically detected and highlighted:

- **January 1**: New Year
- **January 6**: Epiphany
- **May 1**: Labour Day
- **August 15**: Assumption
- **October 26**: National Day
- **November 1**: All Saints
- **December 8**: Immaculate Conception
- **December 25**: Christmas
- **December 26**: St. Stephen

Plus Easter-dependent holidays:

- **Easter Monday**
- **Ascension**
- **Whit Monday**
- **Corpus Christi**

## Security Features

- JWT-based authentication
- Secure password hashing with bcrypt
- Role-based access control (RBAC)
- CORS protection
- Helmet security headers
- SQL injection prevention via ORM
- Invitation-based user registration
- Session management

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
└── README.md             # This file
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

## Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## Building for Production

### Build Frontend

```bash
cd frontend
npm run build
```

### Build Backend

```bash
cd backend
npm run build
```

### Run Production Build

```bash
# Backend
cd backend
npm start

# Or use Docker Compose with production configuration
docker-compose -f docker-compose.prod.yml up
```

## Contributing

Contributions are welcome. Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Known Issues & Roadmap

### Recently Completed

- Dark mode - Full dark mode support with system preference detection
- Zoom controls - Four zoom levels (Compact, Narrow, Normal, Wide)
- User preferences - Persistent settings per user (zoom, collapsed state, filters)
- English localization - Full UI translation from German to English
- Quick deletion - CTRL+click and right-click deletion without confirmation
- Smart filtering - Hide tentative projects, auto-hide empty members/projects
- Milestone markers - Add flag icons to mark important project dates
- Avatar upload - Custom avatar support with 5MB upload limit
- Email infrastructure - Mailpit integration with React Email templates for development testing
- Docker Compose setup - Fully containerized development environment with database initialization

### Roadmap

- Production email integration (SMTP configuration for real email sending)
- Integrate email sending into invitation workflows
- Export functionality (PDF, Excel)
- Advanced filtering and search
- Capacity planning features
- Custom working hours per team member
- Multi-language support
- Mobile app
- Bulk assignment operations
- Assignment templates
- Resource utilization reports

## Support

For issues, questions, or suggestions:

- **Email**: support@ovos.at
- **GitHub Issues**: [https://github.com/rohschinken/ovos-sprint/issues](https://github.com/rohschinken/ovos-sprint/issues)

_Last Updated: December 2025_
