import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import Timeline from '@/components/Timeline'
import { useAuthStore } from '@/store/auth'
import { LayoutGrid, List, Filter, ZoomIn } from 'lucide-react'
import { TimelineViewMode, Team } from '@/types'
import { motion } from 'framer-motion'

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const [viewMode, setViewMode] = useState<TimelineViewMode>('by-member')
  const [prevDays, setPrevDays] = useState(1)
  const [nextDays, setNextDays] = useState(30)
  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>([])
  const [zoomLevel, setZoomLevel] = useState(2) // 1-4, default 2 (narrow)
  const [expandedItems, setExpandedItems] = useState<number[]>([])
  const [hideTentative, setHideTentative] = useState(true) // default: hidden

  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await api.get('/settings')
      return response.data as Record<string, string>
    },
  })

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await api.get('/teams')
      return response.data as Team[]
    },
  })

  // Load user preferences from localStorage
  useEffect(() => {
    if (!user?.id) return

    const prefsKey = `dashboard-prefs-${user.id}`
    const savedPrefs = localStorage.getItem(prefsKey)
    if (savedPrefs) {
      try {
        const prefs = JSON.parse(savedPrefs)
        if (prefs.viewMode) setViewMode(prefs.viewMode)
        if (prefs.selectedTeamIds) setSelectedTeamIds(prefs.selectedTeamIds)
        if (prefs.zoomLevel) setZoomLevel(prefs.zoomLevel)
        if (prefs.expandedItems !== undefined) setExpandedItems(prefs.expandedItems)
        if (prefs.hideTentative !== undefined) setHideTentative(prefs.hideTentative)
      } catch (error) {
        console.error('Failed to load dashboard preferences:', error)
      }
    }
  }, [user?.id])

  // Save user preferences to localStorage
  useEffect(() => {
    if (!user?.id) return

    const prefsKey = `dashboard-prefs-${user.id}`
    const prefs = {
      viewMode,
      selectedTeamIds,
      zoomLevel,
      expandedItems,
      hideTentative,
    }
    localStorage.setItem(prefsKey, JSON.stringify(prefs))
  }, [user?.id, viewMode, selectedTeamIds, zoomLevel, expandedItems, hideTentative])

  useEffect(() => {
    if (settings.timelinePrevDays) {
      setPrevDays(parseInt(settings.timelinePrevDays))
    }
    if (settings.timelineNextDays) {
      setNextDays(parseInt(settings.timelineNextDays))
    }
  }, [settings])

  const toggleTeam = (teamId: number) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId]
    )
  }

  const clearTeamFilter = () => {
    setSelectedTeamIds([])
  }

  const selectAllTeams = () => {
    setSelectedTeamIds(teams.map((t) => t.id))
  }

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
        <div className="flex gap-3">
          {/* Zoom Slider */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 px-4 py-2 rounded-md border bg-background"
          >
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={[zoomLevel]}
              onValueChange={([value]) => setZoomLevel(value)}
              min={1}
              max={4}
              step={1}
              className="w-32"
            />
            <span className="text-xs font-medium text-muted-foreground w-16">
              {['Compact', 'Narrow', 'Normal', 'Wide'][zoomLevel - 1]}
            </span>
          </motion.div>

          <Popover>
            <PopoverTrigger asChild>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Teams
                  {selectedTeamIds.length > 0 && (
                    <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                      {selectedTeamIds.length}
                    </span>
                  )}
                </Button>
              </motion.div>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Filter by Team</h4>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectAllTeams}
                      className="h-7 text-xs"
                    >
                      All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearTeamFilter}
                      className="h-7 text-xs"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {teams.map((team) => (
                    <div key={team.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`team-${team.id}`}
                        checked={selectedTeamIds.includes(team.id)}
                        onCheckedChange={() => toggleTeam(team.id)}
                      />
                      <Label
                        htmlFor={`team-${team.id}`}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {team.name}
                      </Label>
                    </div>
                  ))}
                  {teams.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No teams available
                    </p>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="flex items-center gap-2 px-3 py-2 rounded-md border bg-background"
          >
            <Checkbox
              id="hide-tentative"
              checked={hideTentative}
              onCheckedChange={(checked) => setHideTentative(!!checked)}
            />
            <Label
              htmlFor="hide-tentative"
              className="text-sm font-medium cursor-pointer"
            >
              Hide Tentative
            </Label>
          </motion.div>
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
        <Card className="p-4 card-gradient-subtle">
          <Timeline
            viewMode={viewMode}
            prevDays={prevDays}
            nextDays={nextDays}
            isAdmin={user?.role === 'admin'}
            selectedTeamIds={selectedTeamIds}
            zoomLevel={zoomLevel}
            expandedItems={expandedItems}
            onExpandedItemsChange={setExpandedItems}
            hideTentative={hideTentative}
          />
        </Card>
      </motion.div>
    </motion.div>
  )
}
