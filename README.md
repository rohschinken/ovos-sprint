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
SMTP_FROM_NAME=ovos Sprint 🏃‍♂️‍➡️
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

1. Navigate to the Users page from the admin dashboard
2. Click "Invite User" to create an invitation
3. Enter the user's email and select their role
4. The invitation email is sent automatically via SMTP
5. Users can register using the link in their email

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

## Production Deployment

### Environment Variables

For production deployment, configure the following environment variables in `backend/.env`:

```env
# Required for production
NODE_ENV=production
PORT=3001
DATABASE_URL=./data/ovos-sprint.db
JWT_SECRET=your-secure-random-string-here
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com

# Email (SparkPost SMTP Relay)
SMTP_HOST=smtp.sparkpostmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=SMTP_Injection
SMTP_PASSWORD=your-sparkpost-api-key
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=ovos Sprint 🏃‍♂️‍➡️
```

**Important**: The backend will fail to start in production if `JWT_SECRET`, `FRONTEND_URL`, or `BACKEND_URL` are missing or using default values.

### Non-Interactive Database Seeding

For automated deployments, set these environment variables before running the seed script:

```bash
ADMIN_EMAIL=admin@yourdomain.com ADMIN_PASSWORD=your-secure-password npm run db:seed
```

If `ADMIN_PASSWORD` is not provided, a secure password will be auto-generated.

### Process Management

Use PM2 or systemd to manage the Node.js process:

```bash
# Install PM2
npm install -g pm2

# Start the application
cd backend
pm2 start dist/index.js --name ovos-sprint

# Save the process list
pm2 save

# Set up startup script
pm2 startup
```

### Reverse Proxy (nginx)

Example nginx configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend (static files)
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # Avatars
    location /avatars {
        proxy_pass http://localhost:3001;
    }
}
```

### SQLite Backup Strategy

Set up regular backups of the SQLite database:

```bash
# Create backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
sqlite3 /path/to/data/ovos-sprint.db ".backup '/path/to/backups/ovos-sprint_$DATE.db'"

# Keep only last 7 days of backups
find /path/to/backups -name "ovos-sprint_*.db" -mtime +7 -delete
```

Add to crontab for daily backups:

```bash
0 2 * * * /path/to/backup-script.sh
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Change `JWT_SECRET` to a secure random string (32+ characters)
- [ ] Set `FRONTEND_URL` and `BACKEND_URL` to your actual domains
- [ ] Configure SMTP for email delivery (SparkPost recommended)
- [ ] Set up reverse proxy (nginx/Caddy) for HTTPS
- [ ] Use PM2 or systemd for process management
- [ ] Configure SQLite backup strategy
- [ ] Build frontend: `cd frontend && npm run build`
- [ ] Build backend: `cd backend && npm run build`

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or suggestions:

- **Email**: rohschinken@gmail.com
- **GitHub Issues**: [https://github.com/rohschinken/ovos-sprint/issues](https://github.com/rohschinken/ovos-sprint/issues)

_Last Updated: December 2025_
