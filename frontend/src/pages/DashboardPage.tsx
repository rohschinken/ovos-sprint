import { useQuery } from '@tanstack/react-query'
import { useMemo, useEffect } from 'react'
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
import { useTimelineData } from '@/hooks/useTimelineData'
import { addDays } from 'date-fns'

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

  // Calculate date range for timeline data fetching
  const startDate = useMemo(() => addDays(new Date(), -prevDays), [prevDays])
  const endDate = useMemo(() => addDays(new Date(), nextDays), [nextDays])

  // Calculate visible dates based on showWeekends setting
  const dates = useMemo(() => {
    const dateList: Date[] = []
    let currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      if (showWeekends || (currentDate.getDay() !== 0 && currentDate.getDay() !== 6)) {
        dateList.push(new Date(currentDate))
      }
      currentDate = addDays(currentDate, 1)
    }
    return dateList
  }, [startDate, endDate, showWeekends])

  // Fetch timeline data with filtering
  const {
    filteredProjects,
    filteredMembers,
    projectAssignments,
    dayAssignments,
  } = useTimelineData(
    startDate,
    endDate,
    selectedTeamIds,
    showTentative,
    dates
  )

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

  // Pre-compute date Set for O(1) lookups instead of O(n) comparison
  const dateSet = useMemo(() => {
    return new Set(dates.map(d => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }))
  }, [dates])

  // Pre-compute assignment indexes to avoid triple-nested loops
  const assignmentIndexes = useMemo(() => {
    const startTime = performance.now()

    // Create index: assignmentId -> set of dates
    const assignmentDates = new Map<number, Set<string>>()

    dayAssignments.forEach((da: any) => {
      if (da.projectAssignmentId && dateSet.has(da.date)) {
        if (!assignmentDates.has(da.projectAssignmentId)) {
          assignmentDates.set(da.projectAssignmentId, new Set())
        }
        assignmentDates.get(da.projectAssignmentId)!.add(da.date)
      }
    })

    const duration = performance.now() - startTime
    console.log('[Performance Debug] assignmentIndexes computed:', {
      indexSize: assignmentDates.size,
      duration: `${duration.toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    })

    return assignmentDates
  }, [dayAssignments, dateSet])

  // Calculate actually visible items (accounting for hideEmptyRows and filtering)
  const visibleItems = useMemo(() => {
    const startTime = performance.now()

    let result
    if (viewMode === 'by-project') {
      if (!hideEmptyRows) {
        result = filteredProjects
      } else {
        // O(n×m) instead of O(n×m×p)
        result = filteredProjects.filter(project => {
          return projectAssignments.some((pa: any) => {
            if (pa.projectId !== project.id) return false
            const dates = assignmentIndexes.get(pa.id)
            return dates && dates.size > 0
          })
        })
      }
    } else {
      if (!hideEmptyRows) {
        result = filteredMembers
      } else {
        result = filteredMembers.filter(member => {
          return projectAssignments.some((pa: any) => {
            if (pa.teamMemberId !== member.id) return false
            const dates = assignmentIndexes.get(pa.id)
            return dates && dates.size > 0
          })
        })
      }
    }

    const duration = performance.now() - startTime
    console.log('[Performance Debug] visibleItems calculated:', {
      viewMode,
      hideEmptyRows,
      totalItems: viewMode === 'by-project' ? filteredProjects.length : filteredMembers.length,
      visibleItems: result.length,
      duration: `${duration.toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    })

    return result
  }, [viewMode, filteredProjects, filteredMembers, hideEmptyRows, projectAssignments, assignmentIndexes])

  // Calculate accurate "all expanded" state
  const isAllExpanded = useMemo(() => {
    if (visibleItems.length === 0) return false
    return visibleItems.every(item => expandedItems.includes(item.id))
  }, [visibleItems, expandedItems])

  const toggleExpandAll = () => {
    if (isAllExpanded) {
      // Collapse all visible items
      setExpandedItems([])
    } else {
      // Expand all visible items
      setExpandedItems(visibleItems.map(item => item.id))
    }
  }

  // Clear expanded items when switching view modes
  useEffect(() => {
    setExpandedItems([])
  }, [viewMode])

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
            isAllExpanded={isAllExpanded}
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
            warnWeekends={warnWeekends}
          />
        </Card>
      </motion.div>
    </motion.div>
  )
}
