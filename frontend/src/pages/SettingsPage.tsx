import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTheme } from '@/hooks/use-theme'
import { Moon, Sun } from 'lucide-react'
import { motion } from 'framer-motion'

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="container mx-auto">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-2xl"
    >
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your preferences</p>
      </div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize the look and feel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Dark Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Toggle between light and dark theme
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleTheme}
                className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors ${
                  theme === 'dark' ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <motion.span
                  animate={{ x: theme === 'dark' ? 44 : 4 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg"
                >
                  {theme === 'dark' ? (
                    <Moon className="h-5 w-5 text-primary" />
                  ) : (
                    <Sun className="h-5 w-5 text-yellow-500" />
                  )}
                </motion.span>
              </motion.button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

    </motion.div>
    </div>
  )
}
