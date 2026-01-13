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
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import Timeline from '@/components/Timeline'
import { useAuthStore } from '@/store/auth'
import { Filter, ZoomIn, Eye, UnfoldVertical, FoldVertical, Briefcase, UserCircle } from 'lucide-react'
import { TimelineViewMode, Team } from '@/types'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const [prefsLoaded, setPrefsLoaded] = useState(false)
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

  // Load user preferences from localStorage on mount
  useEffect(() => {
    if (!user?.id || prefsLoaded) return

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
    setPrefsLoaded(true)
  }, [user?.id, prefsLoaded])

  // Save user preferences to localStorage (only after initial load)
  useEffect(() => {
    if (!user?.id || !prefsLoaded) return

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
  }, [user?.id, prefsLoaded, viewMode, selectedTeamIds, zoomLevel, expandedItems, showTentative, showWeekends, showOverlaps])

  // Auto-initialize team filters for first-time users
  useEffect(() => {
    if (!user?.id) return

    const hasInitializedKey = `dashboard-team-initialized-${user.id}`
    const hasInitialized = localStorage.getItem(hasInitializedKey)

    // Only auto-initialize if:
    // 1. Never initialized before (tracked separately from preferences)
    // 2. User has linked teams
    if (!hasInitialized && user.teams && user.teams.length > 0) {
      setSelectedTeamIds(user.teams)
      localStorage.setItem(hasInitializedKey, 'true')
    }
  }, [user?.id, user?.teams])

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

  const handleSettingChange = (key: string, value: boolean | string) => {
    updateSettingMutation.mutate({ key, value: typeof value === 'boolean' ? value.toString() : value })
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

  const selectMyTeams = () => {
    setSelectedTeamIds(user?.teams || [])
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
      className="space-y-6 flex-1 flex flex-col overflow-hidden"
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
            className={cn("flex items-center gap-3 px-4 h-12 rounded-md border bg-background", viewMode === 'by-project' ? 'border-mode-project' : 'border-mode-member')}
          >
            <span className="text-sm font-medium">
              By Member
            </span>
            <div className="relative">
              <Switch
                checked={viewMode === 'by-project'}
                onCheckedChange={(checked) => setViewMode(checked ? 'by-project' : 'by-member')}
                className={cn(
                  "h-7 w-14 [&>span]:hidden",
                  viewMode === 'by-member' ? 'bg-mode-member' : 'bg-mode-project'
                )}
              />
              <div className="absolute top-[2px] left-0 flex items-center pointer-events-none">
                <div className={cn(
                  "h-6 w-6 rounded-full bg-background shadow-sm flex items-center justify-center transition-transform duration-200",
                  viewMode === 'by-project' ? 'translate-x-[30px]' : 'translate-x-[2px]'
                )}>
                  {viewMode === 'by-project' ? (
                    <Briefcase className="h-4 w-4 font-color-mode-project" />
                  ) : (
                    <UserCircle className="h-4 w-4 font-color-mode-member" />
                  )}
                </div>
              </div>
            </div>
            <span className="text-sm font-medium">
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
                  className="gap-2 h-12 min-w-[130px]"
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
            <ZoomIn className="h-4 w-4" />
            <Slider
              value={[zoomLevel]}
              onValueChange={([value]) => setZoomLevel(value)}
              min={1}
              max={4}
              step={1}
              className="w-32"
            />
            <span className="text-sm font-medium w-16">
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
                    {user?.teams && user.teams.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={selectMyTeams}
                        className="h-7 text-xs"
                      >
                        Mine
                      </Button>
                    )}
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
                {user?.teams && user.teams.length > 0 && (
                  <>
                    <div className="text-xs text-muted-foreground font-medium">My Teams</div>
                    <div className="space-y-2">
                      {teams.filter(t => user.teams!.includes(t.id)).map((team) => (
                        <div key={team.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`my-team-${team.id}`}
                            checked={selectedTeamIds.includes(team.id)}
                            onCheckedChange={() => toggleTeam(team.id)}
                          />
                          <Label
                            htmlFor={`my-team-${team.id}`}
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            {team.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-2">
                      <div className="text-xs text-muted-foreground font-medium mb-2">All Teams</div>
                    </div>
                  </>
                )}
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
                  <Eye className="h-4 w-4" />
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
                  {(user?.role === 'admin' || user?.role === 'project_manager') && (
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
                        Non-Working Day Warning
                      </Label>
                    </div>
                  )}
                  <div className="space-y-2 pt-2 border-t">
                    <div className="space-y-1">
                      <Label htmlFor="prev-days" className="text-sm font-normal">
                        Previous Days
                      </Label>
                      <Input
                        id="prev-days"
                        type="number"
                        min="0"
                        max="365"
                        value={prevDays}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0
                          setPrevDays(val)
                          handleSettingChange('timelinePrevDays', val.toString())
                        }}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="next-days" className="text-sm font-normal">
                        Next Days
                      </Label>
                      <Input
                        id="next-days"
                        type="number"
                        min="0"
                        max="365"
                        value={nextDays}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0
                          setNextDays(val)
                          handleSettingChange('timelineNextDays', val.toString())
                        }}
                        className="h-8"
                      />
                    </div>
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
        className="min-h-0 flex-1 overflow-hidden flex flex-col"
      >
        <Card className={cn(
          "p-4 border-2 min-h-0 max-h-full overflow-hidden flex flex-col",
          viewMode === 'by-member' ? 'border-mode-member' : 'border-mode-project'
        )}>
          <Timeline
            viewMode={viewMode}
            prevDays={prevDays}
            nextDays={nextDays}
            isAdmin={user?.role === 'admin' || user?.role === 'project_manager'}
            currentUserId={user?.id}
            currentUserRole={user?.role}
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
