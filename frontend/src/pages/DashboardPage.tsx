import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Switch } from '@/components/ui/switch'
import Timeline from '@/components/Timeline'
import { useAuthStore } from '@/store/auth'
import { LayoutGrid, List, Filter, ZoomIn, Settings, UnfoldVertical, FoldVertical, Briefcase, UserCircle } from 'lucide-react'
import { TimelineViewMode, Team } from '@/types'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const [viewMode, setViewMode] = useState<TimelineViewMode>('by-member')
  const [prevDays, setPrevDays] = useState(1)
  const [nextDays, setNextDays] = useState(30)
  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>([])
  const [zoomLevel, setZoomLevel] = useState(2) // 1-4, default 2 (narrow)
  const [expandedItems, setExpandedItems] = useState<number[]>([])
  const [showTentative, setShowTentative] = useState(true) // default: shown
  const [showWeekends, setShowWeekends] = useState(true) // default: shown
  const [showOverlaps, setShowOverlaps] = useState(true) // default: shown
  const [warnWeekends, setWarnWeekends] = useState(true) // default: warn

  const queryClient = useQueryClient()

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

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await api.get('/projects')
      return response.data as any[]
    },
  })

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const response = await api.get('/members')
      return response.data as any[]
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
        if (prefs.showTentative !== undefined) setShowTentative(prefs.showTentative)
        if (prefs.showWeekends !== undefined) setShowWeekends(prefs.showWeekends)
        if (prefs.showOverlaps !== undefined) setShowOverlaps(prefs.showOverlaps)
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
      showTentative,
      showWeekends,
      showOverlaps,
    }
    localStorage.setItem(prefsKey, JSON.stringify(prefs))
  }, [user?.id, viewMode, selectedTeamIds, zoomLevel, expandedItems, showTentative, showWeekends, showOverlaps])

  useEffect(() => {
    if (settings.timelinePrevDays) {
      setPrevDays(parseInt(settings.timelinePrevDays))
    }
    if (settings.timelineNextDays) {
      setNextDays(parseInt(settings.timelineNextDays))
    }
    if (settings.showOverlapVisualization !== undefined) {
      setShowOverlaps(settings.showOverlapVisualization !== 'false')
    }
    if (settings.warnWeekendAssignments !== undefined) {
      setWarnWeekends(settings.warnWeekendAssignments !== 'false')
    }
  }, [settings])

  const updateSettingMutation = useMutation({
    mutationFn: async (data: { key: string; value: string }) => {
      await api.put(`/settings/${data.key}`, { value: data.value })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })

  const handleSettingChange = (key: string, value: boolean) => {
    updateSettingMutation.mutate({ key, value: value.toString() })
  }

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

  const toggleExpandAll = () => {
    // Get all IDs based on current view mode
    const allIds = viewMode === 'by-project'
      ? projects.map((p) => p.id)
      : members.map((m) => m.id)

    // If all are expanded, collapse all. Otherwise expand all.
    const allExpanded = allIds.length > 0 && allIds.every((id) => expandedItems.includes(id))
    setExpandedItems(allExpanded ? [] : allIds)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="container mx-auto">
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
          {/* Mode Toggle Slider */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className={cn(
              "flex items-center gap-3 px-4 h-12 rounded-md border",
              viewMode === 'by-member' ? 'bg-mode-member' : 'bg-mode-project'
            )}
          >
            <span className="text-xs font-medium text-muted-foreground">
              By Member
            </span>
            <div className="relative">
              <Switch
                checked={viewMode === 'by-project'}
                onCheckedChange={(checked) => setViewMode(checked ? 'by-project' : 'by-member')}
                className="h-7 w-14 [&>span]:hidden"
              />
              <div className="absolute inset-0 flex items-center pointer-events-none">
                <div className={cn(
                  "h-7 w-7 flex items-center justify-center transition-transform duration-200",
                  viewMode === 'by-project' ? 'translate-x-[28px]' : 'translate-x-0'
                )}>
                  {viewMode === 'by-project' ? (
                    <Briefcase className="h-4 w-4 text-primary" />
                  ) : (
                    <UserCircle className="h-4 w-4 text-primary" />
                  )}
                </div>
              </div>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              By Project
            </span>
          </motion.div>

          {/* Expand/Collapse All */}
          {(() => {
            const allIds = viewMode === 'by-project'
              ? projects.map((p) => p.id)
              : members.map((m) => m.id)
            const allExpanded = allIds.length > 0 && allIds.every((id) => expandedItems.includes(id))

            return (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  onClick={toggleExpandAll}
                  className="gap-2 h-12"
                >
                  {allExpanded ? <FoldVertical className="h-4 w-4" /> : <UnfoldVertical className="h-4 w-4" />}
                  {allExpanded ? 'Collapse All' : 'Expand All'}
                </Button>
              </motion.div>
            )
          })()}

          {/* Zoom Slider */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 px-4 h-12 rounded-md border bg-background"
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
              {['Extra Narrow', 'Compact', 'Narrow', 'Normal'][zoomLevel - 1]}
            </span>
          </motion.div>

          <Popover>
            <PopoverTrigger asChild>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" className="gap-2 h-12">
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

          <Popover>
            <PopoverTrigger asChild>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" className="gap-2 h-12">
                  <Settings className="h-4 w-4" />
                  Display
                </Button>
              </motion.div>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Display Settings</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-tentative"
                      checked={showTentative}
                      onCheckedChange={(checked) => setShowTentative(!!checked)}
                    />
                    <Label
                      htmlFor="show-tentative"
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      Show Tentative Projects
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-weekends"
                      checked={showWeekends}
                      onCheckedChange={(checked) => setShowWeekends(!!checked)}
                    />
                    <Label
                      htmlFor="show-weekends"
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      Show Weekends
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-overlaps"
                      checked={showOverlaps}
                      onCheckedChange={(checked) => {
                        setShowOverlaps(!!checked)
                        handleSettingChange('showOverlapVisualization', !!checked)
                      }}
                    />
                    <Label
                      htmlFor="show-overlaps"
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      Show Overlap Indicators
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="warn-weekends"
                      checked={warnWeekends}
                      onCheckedChange={(checked) => {
                        setWarnWeekends(!!checked)
                        handleSettingChange('warnWeekendAssignments', !!checked)
                      }}
                    />
                    <Label
                      htmlFor="warn-weekends"
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      Warn Weekend Assignments
                    </Label>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <Card className={cn(
          "p-4 card-gradient-subtle border-2",
          viewMode === 'by-member' ? 'border-mode-member' : 'border-mode-project'
        )}>
          <Timeline
            viewMode={viewMode}
            prevDays={prevDays}
            nextDays={nextDays}
            isAdmin={user?.role === 'admin'}
            selectedTeamIds={selectedTeamIds}
            zoomLevel={zoomLevel}
            expandedItems={expandedItems}
            onExpandedItemsChange={setExpandedItems}
            showTentative={showTentative}
            showWeekends={showWeekends}
            showOverlaps={showOverlaps}
          />
        </Card>
      </motion.div>
    </motion.div>
  )
}
