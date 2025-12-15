import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Timeline from '@/components/Timeline'
import { useAuthStore } from '@/store/auth'
import { LayoutGrid, List } from 'lucide-react'
import { TimelineViewMode } from '@/types'
import { motion } from 'framer-motion'

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const [viewMode, setViewMode] = useState<TimelineViewMode>('by-project')
  const [prevDays, setPrevDays] = useState(1)
  const [nextDays, setNextDays] = useState(30)

  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await api.get('/settings')
      return response.data as Record<string, string>
    },
  })

  useEffect(() => {
    if (settings.timelinePrevDays) {
      setPrevDays(parseInt(settings.timelinePrevDays))
    }
    if (settings.timelineNextDays) {
      setNextDays(parseInt(settings.timelineNextDays))
    }
  }, [settings])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Workload management timeline
          </p>
        </div>
        <div className="flex gap-2">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant={viewMode === 'by-project' ? 'default' : 'outline'}
              onClick={() => setViewMode('by-project')}
              className="gap-2"
            >
              <LayoutGrid className="h-4 w-4" />
              By Project
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant={viewMode === 'by-member' ? 'default' : 'outline'}
              onClick={() => setViewMode('by-member')}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              By Member
            </Button>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <Card className="p-4">
          <Timeline
            viewMode={viewMode}
            prevDays={prevDays}
            nextDays={nextDays}
            isAdmin={user?.role === 'admin'}
          />
        </Card>
      </motion.div>
    </motion.div>
  )
}
