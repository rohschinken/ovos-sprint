import { useQuery } from '@tanstack/react-query'
import api from '@/api/client'
import { Card } from '@/components/ui/card'
import Timeline from '@/components/Timeline'
import { useAuthStore } from '@/store/auth'
import { Team } from '@/types'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useDashboardPreferences } from '@/hooks/useDashboardPreferences'
import { useDashboardSettings } from '@/hooks/useDashboardSettings'
import { TeamFilterPopover, DisplaySettingsPopover, DashboardControls } from '@/components/dashboard'

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user)

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

  // Use custom hooks for preferences and settings management
  const {
    viewMode,
    setViewMode,
    selectedTeamIds,
    setSelectedTeamIds,
    zoomLevel,
    setZoomLevel,
    expandedItems,
    setExpandedItems,
    showTentative,
    setShowTentative,
    showWeekends,
    setShowWeekends,
    showOverlaps,
    setShowOverlaps,
    hideEmptyRows,
    setHideEmptyRows,
    prevDays,
    setPrevDays,
    nextDays,
    setNextDays,
  } = useDashboardPreferences({
    userId: user?.id,
    settings,
  })

  const { warnWeekends, setWarnWeekends, handleSettingChange } = useDashboardSettings({
    settings,
  })

  const toggleTeam = (teamId: number) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId]
    )
  }

  const clearFilter = () => {
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

  const handleDisplaySettingChange = (key: string, value: any) => {
    switch (key) {
      case 'showTentative':
        setShowTentative(value)
        break
      case 'showWeekends':
        setShowWeekends(value)
        break
      case 'showOverlaps':
        setShowOverlaps(value)
        handleSettingChange('showOverlapVisualization', value)
        break
      case 'hideEmptyRows':
        setHideEmptyRows(value)
        break
      case 'warnWeekends':
        setWarnWeekends(value)
        handleSettingChange('warnWeekendAssignments', value)
        break
      case 'prevDays':
        setPrevDays(value)
        handleSettingChange('timelinePrevDays', value.toString())
        break
      case 'nextDays':
        setNextDays(value)
        handleSettingChange('timelineNextDays', value.toString())
        break
    }
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
          <DashboardControls
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            zoomLevel={zoomLevel}
            onZoomChange={setZoomLevel}
            onToggleExpandAll={toggleExpandAll}
            expandedItemsCount={expandedItems.length}
            totalItemsCount={viewMode === 'by-project' ? projects.length : members.length}
          />

          <TeamFilterPopover
            teams={teams}
            selectedTeamIds={selectedTeamIds}
            currentUserTeams={user?.teams}
            onToggleTeam={toggleTeam}
            onClearFilter={clearFilter}
            onSelectAll={selectAllTeams}
            onSelectMyTeams={selectMyTeams}
          />

          <DisplaySettingsPopover
            showTentative={showTentative}
            showWeekends={showWeekends}
            showOverlaps={showOverlaps}
            hideEmptyRows={hideEmptyRows}
            warnWeekends={warnWeekends}
            prevDays={prevDays}
            nextDays={nextDays}
            currentUserRole={user?.role}
            onSettingChange={handleDisplaySettingChange}
          />
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
            hideEmptyRows={hideEmptyRows}
          />
        </Card>
      </motion.div>
    </motion.div>
  )
}
