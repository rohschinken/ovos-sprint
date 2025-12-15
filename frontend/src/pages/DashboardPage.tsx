import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Timeline from '@/components/Timeline'
import { useAuthStore } from '@/store/auth'
import { LayoutGrid, List } from 'lucide-react'
import { TimelineViewMode } from '@/types'

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Workload management timeline
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'by-project' ? 'default' : 'outline'}
            onClick={() => setViewMode('by-project')}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            By Project
          </Button>
          <Button
            variant={viewMode === 'by-member' ? 'default' : 'outline'}
            onClick={() => setViewMode('by-member')}
            className="gap-2"
          >
            <List className="h-4 w-4" />
            By Member
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <Timeline
          viewMode={viewMode}
          prevDays={prevDays}
          nextDays={nextDays}
          isAdmin={user?.role === 'admin'}
        />
      </Card>
    </div>
  )
}
