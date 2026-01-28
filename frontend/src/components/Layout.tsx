import { useState, useEffect } from 'react'
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
  HelpCircle,
} from 'lucide-react'
import { OnboardingModal } from './onboarding'
import { api } from '@/api/client'

export default function Layout() {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false)

  const isActive = (path: string) => location.pathname === path

  // Check if user has seen onboarding on mount
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user || hasCheckedOnboarding) return

      try {
        const response = await api.get('/settings')
        const settings = response.data
        const hasSeenOnboarding = settings.hasSeenOnboarding === 'true'

        if (!hasSeenOnboarding) {
          setShowOnboarding(true)
        }
        setHasCheckedOnboarding(true)
      } catch (error) {
        console.error('Failed to check onboarding status:', error)
        // On error, show onboarding to be safe
        setShowOnboarding(true)
        setHasCheckedOnboarding(true)
      }
    }

    checkOnboarding()
  }, [user, hasCheckedOnboarding])

  const handleOnboardingComplete = async () => {
    try {
      // Save that user has seen onboarding
      await api.put('/settings/hasSeenOnboarding', {
        value: 'true',
      })
      setShowOnboarding(false)
    } catch (error) {
      console.error('Failed to save onboarding status:', error)
      // Close anyway
      setShowOnboarding(false)
    }
  }

  const handleOpenOnboarding = () => {
    setShowOnboarding(true)
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4 xl:space-x-8">
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
                  <span className="hidden xl:inline">Dashboard</span>
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
                      <span className="hidden xl:inline">Users</span>
                    </Button>
                  </Link>
                  <Link to="/teams">
                    <Button
                      variant={isActive('/teams') ? 'default' : 'ghost'}
                      className="gap-2"
                    >
                      <Users className="h-4 w-4" />
                      <span className="hidden xl:inline">Teams</span>
                    </Button>
                  </Link>
                  <Link to="/members">
                    <Button
                      variant={isActive('/members') ? 'default' : 'ghost'}
                      className="gap-2"
                    >
                      <UserCircle className="h-4 w-4" />
                      <span className="hidden xl:inline">Members</span>
                    </Button>
                  </Link>
                </>
              )}
              {(user?.role === 'admin' || user?.role === 'project_manager') && (
                <>
                  <Link to="/customers">
                    <Button
                      variant={isActive('/customers') ? 'default' : 'ghost'}
                      className="gap-2"
                    >
                      <Building2 className="h-4 w-4" />
                      <span className="hidden xl:inline">Customers</span>
                    </Button>
                  </Link>
                  <Link to="/projects">
                    <Button
                      variant={isActive('/projects') ? 'default' : 'ghost'}
                      className="gap-2"
                    >
                      <Briefcase className="h-4 w-4" />
                      <span className="hidden xl:inline">Projects</span>
                    </Button>
                  </Link>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2 xl:gap-4">
            <span className="hidden md:inline text-sm text-muted-foreground">
              {user?.email} {user?.role === 'admin' && '(Admin)'}{user?.role === 'project_manager' && '(PM)'}
            </span>
            <Link to="/settings">
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleOpenOnboarding} title="Help & Tutorial">
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <div className="h-0.5 bg-gradient-primary-via" />
      <main className="p-4 flex-1 overflow-y-auto flex flex-col">
        <Outlet />
      </main>

      {/* Onboarding Modal */}
      <OnboardingModal
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={handleOnboardingComplete}
      />
    </div>
  )
}
