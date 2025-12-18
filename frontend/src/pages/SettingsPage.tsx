import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { useTheme } from '@/hooks/use-theme'
import { Moon, Sun } from 'lucide-react'
import { motion } from 'framer-motion'

export default function SettingsPage() {
  const [warnWeekendAssignments, setWarnWeekendAssignments] = useState(true)
  const [showOverlapVisualization, setShowOverlapVisualization] = useState(true)
  const [timelinePrevDays, setTimelinePrevDays] = useState('1')
  const [timelineNextDays, setTimelineNextDays] = useState('30')

  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { theme, toggleTheme } = useTheme()

  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await api.get('/settings')
      return response.data as Record<string, string>
    },
  })

  useEffect(() => {
    if (settings.warnWeekendAssignments !== undefined) {
      setWarnWeekendAssignments(settings.warnWeekendAssignments === 'true')
    }
    if (settings.showOverlapVisualization !== undefined) {
      setShowOverlapVisualization(settings.showOverlapVisualization === 'true')
    }
    if (settings.timelinePrevDays) {
      setTimelinePrevDays(settings.timelinePrevDays)
    }
    if (settings.timelineNextDays) {
      setTimelineNextDays(settings.timelineNextDays)
    }
  }, [settings])

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const response = await api.put(`/settings/${key}`, { value })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast({ title: 'Settings updated successfully' })
    },
  })

  const handleSave = () => {
    updateSettingMutation.mutate({
      key: 'warnWeekendAssignments',
      value: warnWeekendAssignments.toString(),
    })
    updateSettingMutation.mutate({
      key: 'showOverlapVisualization',
      value: showOverlapVisualization.toString(),
    })
    updateSettingMutation.mutate({
      key: 'timelinePrevDays',
      value: timelinePrevDays,
    })
    updateSettingMutation.mutate({
      key: 'timelineNextDays',
      value: timelineNextDays,
    })
  }

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

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Timeline Settings</CardTitle>
            <CardDescription>Configure the timeline view</CardDescription>
          </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prevDays">Previous Days</Label>
            <Input
              id="prevDays"
              type="number"
              min="0"
              max="365"
              value={timelinePrevDays}
              onChange={(e) => setTimelinePrevDays(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Number of days to show before today
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nextDays">Next Days</Label>
            <Input
              id="nextDays"
              type="number"
              min="1"
              max="365"
              value={timelineNextDays}
              onChange={(e) => setTimelineNextDays(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Number of days to show after today
            </p>
          </div>
        </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Assignment Settings</CardTitle>
            <CardDescription>Configure assignment behavior</CardDescription>
          </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Weekend Assignment Warning</Label>
              <p className="text-sm text-muted-foreground">
                Show warning when assigning work on weekends or holidays
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={warnWeekendAssignments}
              onClick={() => setWarnWeekendAssignments(!warnWeekendAssignments)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                warnWeekendAssignments ? 'bg-primary' : 'bg-input'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  warnWeekendAssignments ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Overlap Visualization</Label>
              <p className="text-sm text-muted-foreground">
                Highlight when a team member has multiple assignments on the
                same day
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showOverlapVisualization}
              onClick={() =>
                setShowOverlapVisualization(!showOverlapVisualization)
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showOverlapVisualization ? 'bg-primary' : 'bg-input'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showOverlapVisualization ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        <Button onClick={handleSave}>Save Settings</Button>
      </motion.div>
    </motion.div>
    </div>
  )
}
