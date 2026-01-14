# OVOS Sprint - Development Setup Guide

## Prerequisites

- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Docker** (optional): Latest version
- **Docker Compose** (optional): Latest version

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

## Docker Compose Details

### Docker Services

The Docker Compose setup includes:

- **Frontend** (React + Vite) - Port 3000
- **Backend** (Node.js + Express) - Port 3001
- **Caddy** - Reverse proxy for both frontend and backend
- **Mailpit** - SMTP server and web UI for email testing (ports 1025, 8025)

### Rebuilding After Changes

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

### Viewing Logs

```bash
# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mailpit
```

### Troubleshooting Docker Setup

If you encounter issues with native modules (like better-sqlite3):

```bash
# Rebuild native modules inside the container
docker compose exec backend npm rebuild better-sqlite3
docker compose restart backend
```

## Environment Configuration (Optional)

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

- **Web UI**: http://localhost:8025
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

All sent emails will appear instantly in the Mailpit web UI at http://localhost:8025.

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

## Development Scripts

### Root (Workspace) Scripts

```bash
npm run dev              # Run both frontend and backend concurrently
npm run dev:backend      # Run backend only
npm run dev:frontend     # Run frontend only
npm run install:all      # Install dependencies for all packages
npm run build            # Build both frontend and backend
npm run build:backend    # Build backend only
npm run build:frontend   # Build frontend only
npm run db:setup         # Initialize and seed database
npm run db:seed          # Seed database only
```

### Backend Scripts

```bash
cd backend
npm run dev              # Start development server with hot reload (tsx watch)
npm run build            # Build TypeScript → JavaScript (dist/)
npm start                # Run production build (node dist/index.js)
npm run db:generate      # Generate database migrations
npm run db:push          # Push schema changes to database
npm run db:migrate       # Run migrations
npm run db:seed          # Seed database with initial data
npm run db:studio        # Open Drizzle Studio (database GUI)
```

### Frontend Scripts

```bash
cd frontend
npm run dev              # Start Vite dev server (port 5173)
npm run build            # Build for production (dist/)
npm run lint             # Run ESLint
npm run preview          # Preview production build
```

## Troubleshooting

### Port Already in Use

If you see "Port already in use" errors:

```bash
# Check what's using port 5173 (frontend)
lsof -i :5173  # macOS/Linux
netstat -ano | findstr :5173  # Windows

# Check what's using port 3001 (backend)
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# Kill the process or change ports in configuration
```

### Database Issues

```bash
# Reset database (WARNING: deletes all data)
rm -rf backend/data/ovos-sprint.db*
npm run db:setup

# Or with Docker
docker compose down
rm -rf data/ovos-sprint.db*
docker compose up --build -d
docker compose exec backend sh -c "echo 'y' | npm run db:push"
docker compose exec backend sh -c "echo -e 'admin@example.com\npassword' | npm run db:seed"
```

### Native Module Build Errors

If you encounter build errors for native modules (better-sqlite3, sharp):

**macOS**:
```bash
xcode-select --install
```

**Ubuntu/Debian**:
```bash
sudo apt install -y build-essential python3 python3-dev libsqlite3-dev
```

**Windows**:
- Install Visual Studio Build Tools
- Or install windows-build-tools: `npm install --global windows-build-tools`

Then clean and reinstall:
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

Once your development environment is running:

1. Log in with your admin credentials
2. Explore the dashboard and timeline views
3. Create some test teams, members, and projects
4. Try assigning members to projects in the timeline
5. Check Mailpit to see invitation emails

For production deployment, see [PRODUCTION_BUILD_SETUP.md](PRODUCTION_BUILD_SETUP.md).
