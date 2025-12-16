# ovos Sprint 🏃‍♂️‍➡️

**Professional Workload Management & Resource Planning Tool for IT Project Managers**

ovos Sprint is a modern, real-time web application designed to help IT project managers visualize and manage team workloads efficiently. Built with cutting-edge technologies, it offers an intuitive timeline-based interface for resource allocation and project planning.

![ovos Sprint](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## ✨ Features

### 🔐 **Role-Based Access Control**

- **Admin Role**: Full CRUD permissions for all entities
- **User Role**: Read-only access to view workload and assignments
- **Invitation-Based Registration**: Secure user onboarding via email invitations

### 👥 **Team & Resource Management**

- Create and manage multiple teams
- Add team members with customizable avatars (upload or auto-generated)
- Organize resources efficiently across projects

### 📊 **Project Management**

- Create projects with customer information
- Two status types: **Confirmed** and **Tentative**
- Visual status indicators throughout the interface
- Many-to-many relationships between team members and projects

### 📅 **Interactive Timeline View**

Two powerful view modes:

- **By Project**: View all team members assigned to each project
- **By Team Member**: View all projects assigned to each team member

Timeline features:

- Configurable date range (previous X days, next X days)
- Day-by-day workload visualization
- Weekend highlighting (Saturday & Sunday)
- Austrian federal holiday detection with names
- Current day indicator
- Expandable/collapsible project and member rows

### 🎯 **Drag-to-Assign Functionality** (Admin Only)

- Intuitive click-and-drag interface for day assignments
- Multi-day selection support
- Weekend/holiday assignment warnings (configurable)
- Visual feedback during drag operations
- Optional comments on assignments

### ⚙️ **Customizable Settings**

- Toggle weekend/holiday assignment warnings
- Configure overlap visualization
- Adjust timeline date ranges
- Per-user preferences

### 🔄 **Real-Time Updates**

- WebSocket-based live synchronization
- Instant updates when multiple users work simultaneously
- No page refresh required

### 🎨 **Modern UI/UX**

- Clean, professional design
- Smooth micro-animations
- Responsive layout
- Accessible color scheme
- Intuitive navigation

---

## 🛠️ Technology Stack

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
- **Security**: Helmet, CORS

### DevOps & Infrastructure

- **Containerization**: Docker
- **Reverse Proxy**: Caddy
- **Orchestration**: Docker Compose
- **Database Migrations**: Drizzle Kit

---

## 📋 Prerequisites

- **Node.js**: v20.x or higher
- **Docker**: Latest version
- **Docker Compose**: Latest version
- **npm**: v10.x or higher

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/rohschinken/ovos-sprint.git
cd ovos-sprint
```

### 2. Install Dependencies

**Backend:**

```bash
cd backend
npm install
```

**Frontend:**

```bash
cd ../frontend
npm install
```

### 3. Environment Setup

Create a `.env` file in the `backend` directory:

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
```

### 4. Initialize Database

```bash
cd backend
npm run db:generate  # Generate migration files
npm run db:migrate   # Run migrations
npm run db:seed      # Seed admin account
```

**⚠️ Important**: The seed command will output admin credentials. **Save these securely!**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email: af@ovos.at
🔑 Password: [generated-password]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 5. Start with Docker Compose

```bash
docker-compose up --build
```

The application will be available at:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **WebSocket**: ws://localhost:3001

### 6. Development Mode (Optional)

If you prefer running without Docker:

**Backend:**

```bash
cd backend
npm run dev
```

**Frontend:**

```bash
cd frontend
npm run dev
```

---

## 👤 Default Admin Account

After seeding the database, log in with:

- **Email**: `af@ovos.at`
- **Password**: _(check console output from seed command)_

---

## 📚 User Guide

### For Admins

#### **Inviting Users**

1. Navigate to the admin dashboard
2. Use the invite function to send invitation links
3. Invitation links are displayed in the console (email integration pending)
4. Share the link with the user

#### **Creating Teams**

1. Go to **Teams** page
2. Click **Create Team**
3. Enter team name
4. Add members to the team

#### **Managing Team Members**

1. Go to **Team Members** page
2. Click **Add Member**
3. Enter first name and last name
4. Avatar will be auto-generated (custom upload available)

#### **Creating Projects**

1. Go to **Projects** page
2. Click **Create Project**
3. Enter customer name and project name
4. Select status (Confirmed/Tentative)

#### **Assigning Team Members to Projects**

1. In the timeline view, expand a project (By Project mode)
2. You'll see all team members assigned to that project
3. First, create a general assignment between member and project
4. Then drag across days to create day-specific assignments

#### **Day-by-Day Assignment**

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

---

## ⚙️ Configuration

### Timeline Settings

Configure in **Settings** page:

- **Previous Days**: How many days before today to show (default: 1)
- **Next Days**: How many days after today to show (default: 30)

### Assignment Settings

- **Weekend Assignment Warning**: Enable/disable warnings when assigning work on weekends or holidays
- **Overlap Visualization**: Enable/disable highlighting when team members have multiple assignments on the same day

---

## 🗓️ Austrian Holidays

The following Austrian federal holidays are automatically detected and highlighted:

- **January 1**: Neujahr (New Year's Day)
- **January 6**: Heilige Drei Könige (Epiphany)
- **May 1**: Staatsfeiertag (Labour Day)
- **August 15**: Mariä Himmelfahrt (Assumption Day)
- **October 26**: Nationalfeiertag (National Day)
- **November 1**: Allerheiligen (All Saints' Day)
- **December 8**: Mariä Empfängnis (Immaculate Conception)
- **December 25**: Weihnachten (Christmas Day)
- **December 26**: Stefanitag (St. Stephen's Day)

Plus Easter-dependent holidays:

- **Ostermontag** (Easter Monday)
- **Christi Himmelfahrt** (Ascension Day)
- **Pfingstmontag** (Whit Monday)
- **Fronleichnam** (Corpus Christi)

---

## 🔐 Security Features

- JWT-based authentication
- Secure password hashing with bcrypt
- Role-based access control (RBAC)
- CORS protection
- Helmet security headers
- SQL injection prevention via ORM
- Invitation-based user registration
- Session management

---

## 📂 Project Structure

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

---

## 🔧 API Endpoints

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

---

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

---

## 📦 Building for Production

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

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🐛 Known Issues & Roadmap

### Known Issues

- Email invitations currently only output to console (SMTP integration pending)
- Avatar upload requires manual implementation on admin pages

### Roadmap

- [ ] Email integration (SparkPost SMTP)
- [ ] Export functionality (PDF, Excel)
- [ ] Advanced filtering and search
- [ ] Capacity planning features
- [ ] Custom working hours per team member
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Mobile app

---

## 📞 Support

For issues, questions, or suggestions:

- **Email**: support@ovos.at
- **GitHub Issues**: [https://github.com/rohschinken/ovos-sprint/issues](https://github.com/rohschinken/ovos-sprint/issues)

---

## 🙏 Acknowledgments

- **shadcn/ui** for beautiful UI components
- **Radix UI** for accessible component primitives
- **Tailwind CSS** for utility-first styling
- **Drizzle ORM** for type-safe database operations
- All contributors and supporters of this project

---

**Made with ❤️ by ovos**

---

_Last Updated: December 2025_
