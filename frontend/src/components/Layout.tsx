import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Button } from './ui/button'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  UserCircle,
  Settings,
  LogOut,
  Mail,
  Building2,
} from 'lucide-react'

export default function Layout() {
  const { user, logout } = useAuthStore()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-bold text-gradient-primary">
              ovos Sprint 🏃‍♂️‍➡️
            </h1>
            <nav className="flex space-x-1">
              <Link to="/dashboard">
                <Button
                  variant={isActive('/dashboard') ? 'default' : 'ghost'}
                  className="gap-2"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              {user?.role === 'admin' && (
                <>
                  <Link to="/users">
                    <Button
                      variant={isActive('/users') ? 'default' : 'ghost'}
                      className="gap-2"
                    >
                      <Mail className="h-4 w-4" />
                      Users
                    </Button>
                  </Link>
                  <Link to="/teams">
                    <Button
                      variant={isActive('/teams') ? 'default' : 'ghost'}
                      className="gap-2"
                    >
                      <Users className="h-4 w-4" />
                      Teams
                    </Button>
                  </Link>
                  <Link to="/members">
                    <Button
                      variant={isActive('/members') ? 'default' : 'ghost'}
                      className="gap-2"
                    >
                      <UserCircle className="h-4 w-4" />
                      Members
                    </Button>
                  </Link>
                  <Link to="/customers">
                    <Button
                      variant={isActive('/customers') ? 'default' : 'ghost'}
                      className="gap-2"
                    >
                      <Building2 className="h-4 w-4" />
                      Customers
                    </Button>
                  </Link>
                  <Link to="/projects">
                    <Button
                      variant={isActive('/projects') ? 'default' : 'ghost'}
                      className="gap-2"
                    >
                      <Briefcase className="h-4 w-4" />
                      Projects
                    </Button>
                  </Link>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              {user?.email} {user?.role === 'admin' && '(Admin)'}
            </span>
            <Link to="/settings">
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <div className="h-0.5 bg-gradient-primary-via" />
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  )
}
