import { useRef, useEffect, useMemo } from 'react'
import type { Milestone, AssignmentGroup, AssignmentPriority } from '@/types'
import { isWeekend } from '@/lib/holidays'
import { TooltipProvider } from './ui/tooltip'
import { format, addDays, startOfDay, isSameDay } from 'date-fns'
import { enGB } from 'date-fns/locale'
import { WarningDialog } from './ui/warning-dialog'
import { AssignmentEditPopover } from './AssignmentEditPopover'
import { useDragAssignment } from '@/hooks/useDragAssignment'
import { useTimelineWarning } from '@/hooks/useTimelineWarning'
import { useEditPopover } from '@/hooks/useEditPopover'
import { useTimelineData } from '@/hooks/useTimelineData'
import { useTimelineMutations } from '@/hooks/useTimelineMutations'
import { TimelineViewContent } from './timeline/TimelineViewContent'
import {
  ZOOM_COLUMN_WIDTHS,
  DEFAULT_COLUMN_WIDTH,
  type ZoomLevel
} from '@/lib/timeline-constants'
import {
  getMemberAssignmentsOnDate,
  getProjectMembersOnDate
} from '@/lib/timeline-helpers'
import type { TimelineProps } from './types'

export default function Timeline({
  viewMode,
  prevDays,
  nextDays,
  isAdmin,
  currentUserId,
  currentUserRole,
  selectedTeamIds,
  zoomLevel,
  expandedItems: expandedItemsProp,
  onExpandedItemsChange,
  showTentative,
  showWeekends,
  showOverlaps,
  hideEmptyRows,
}: TimelineProps) {
  // Track if initial expansion has been done to prevent re-expanding when user collapses all
  const hasInitializedExpansion = useRef(false)

  // Convert expandedItems array to Set for easier manipulation
  const expandedItemsSet = new Set(expandedItemsProp)

  // Column width based on zoom level (1=extra narrow, 2=compact, 3=narrow, 4=normal)
  const columnWidth = ZOOM_COLUMN_WIDTHS[zoomLevel as ZoomLevel] || DEFAULT_COLUMN_WIDTH

  // Generate dates
  const today = startOfDay(new Date())
  const startDate = addDays(today, -prevDays)
  const allDates: Date[] = []
  for (let i = 0; i <= prevDays + nextDays; i++) {
    allDates.push(addDays(startDate, i))
  }

  // Filter out weekends if showWeekends is disabled
  const dates = showWeekends ? allDates : allDates.filter(date => !isWeekend(date))

  // Group dates by month for month labels
  const monthGroups: { month: string; count: number; firstDate: Date }[] = []
  let currentMonth = ''
  let currentCount = 0
  let currentFirstDate: Date | null = null

  dates.forEach((date) => {
    const monthKey = format(date, 'MMMM yyyy', { locale: enGB })
    if (monthKey !== currentMonth) {
      if (currentMonth) {
        monthGroups.push({ month: currentMonth, count: currentCount, firstDate: currentFirstDate! })
      }
      currentMonth = monthKey
      currentCount = 1
      currentFirstDate = date
    } else {
      currentCount++
    }
  })
  if (currentMonth) {
    monthGroups.push({ month: currentMonth, count: currentCount, firstDate: currentFirstDate! })
  }

  // Fetch timeline data using custom hook
  const {
    filteredProjects,
    filteredMembers: filteredMembersWithProjects,
    projectAssignments,
    dayAssignments,
    milestones,
    dayOffs,
    settings,
    assignmentGroups,
  } = useTimelineData(
    startDate,
    dates[dates.length - 1],
    selectedTeamIds,
    showTentative,
    dates
  )

  // Get reference to data for helper functions
  const members = filteredMembersWithProjects
  const projects = filteredProjects

  // Memoize work schedule parsing to avoid repeated JSON.parse calls
  const workScheduleCache = useMemo(() => {
    const cache = new Map<number, any>()
    members.forEach(member => {
      try {
        cache.set(member.id, JSON.parse(member.workSchedule))
      } catch {
        cache.set(member.id, null)
      }
    })
    return cache
  }, [members])

  // Helper function to check if a date is a day-off for a specific member
  const isDayOff = (memberId: number, date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return dayOffs.some(
      dayOff => dayOff.teamMemberId === memberId && dayOff.date === dateStr
    )
  }

  // Helper function to check if a date is a non-working day for a specific member
  const isNonWorkingDay = (memberId: number, date: Date): boolean => {
    const member = members.find((m) => m.id === memberId)
    if (!member) return false

    // Check day-off first
    if (isDayOff(memberId, date)) return true

    // Use cached schedule instead of parsing every time
    const schedule = workScheduleCache.get(memberId)
    if (!schedule) {
      // If parsing failed, fall back to weekend check
      return isWeekend(date)
    }

    const dayOfWeek = date.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
    // Change from Sunday-first to Monday-first
    const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
    const dayIndex = (dayOfWeek === 0) ? 6 : dayOfWeek - 1  // Convert Sun=0 to index 6
    return !schedule[dayKeys[dayIndex]]
  }

  // Helper function to check if current user can edit an assignment (by project assignment ID)
  const canEditAssignment = (projectAssignmentId: number): boolean => {
    if (!isAdmin) return false
    if (currentUserRole === 'admin') return true
    if (currentUserRole === 'project_manager' && currentUserId) {
      const assignment = projectAssignments.find((pa: any) => pa.id === projectAssignmentId)
      if (!assignment) return false
      const project = projects.find(p => p.id === assignment.projectId)
      return project?.managerId === currentUserId
    }
    return false
  }

  // Get the assignment group for a specific date within an assignment
  const getGroupForDate = (assignmentId: number, date: Date): AssignmentGroup | null => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return assignmentGroups.find(g =>
      g.projectAssignmentId === assignmentId &&
      dateStr >= g.startDate &&
      dateStr <= g.endDate
    ) ?? null
  }

  // Use custom hooks for state management
  const { timelineWarning, setTimelineWarning } = useTimelineWarning()

  const { editPopover, setEditPopover, handleAssignmentClick } = useEditPopover(
    canEditAssignment,
    dayAssignments,
    getGroupForDate
  )

  const {
    deleteDayAssignmentMutation,
    createBatchDayAssignmentsMutation,
    createMilestoneMutation,
    deleteMilestoneMutation,
    createDayOffMutation,
    deleteDayOffMutation,
    saveAssignmentGroupMutation,
  } = useTimelineMutations()

  const { dragState, handleMouseDown, handleMouseEnter } = useDragAssignment(
    projectAssignments,
    filteredMembersWithProjects,
    settings,
    dayAssignments,
    dates,
    createBatchDayAssignmentsMutation,
    setTimelineWarning,
    isNonWorkingDay
  )

  // Reset initialization flag when view mode changes
  useEffect(() => {
    hasInitializedExpansion.current = false
  }, [viewMode])

  // Initialize all items as expanded by default (when no saved preferences)
  useEffect(() => {
    // Only run once per view mode, and only if there are no saved preferences
    if (!hasInitializedExpansion.current && expandedItemsProp.length === 0 && (filteredProjects.length > 0 || filteredMembersWithProjects.length > 0)) {
      const allIds = viewMode === 'by-project'
        ? filteredProjects.map((p) => p.id)
        : filteredMembersWithProjects.map((m) => m.id)
      onExpandedItemsChange(allIds)
      hasInitializedExpansion.current = true
    }
  }, [filteredProjects, filteredMembersWithProjects, viewMode]) // Only run when data loads or view mode changes

  const toggleExpand = (id: number) => {
    const newExpandedSet = new Set(expandedItemsProp)
    if (newExpandedSet.has(id)) {
      newExpandedSet.delete(id)
    } else {
      newExpandedSet.add(id)
    }
    onExpandedItemsChange(Array.from(newExpandedSet))
  }

  // Helper function to check if current user can edit a specific project
  // Admins can edit all projects, PMs can only edit their own projects
  const canEditProject = (projectId: number): boolean => {
    if (!isAdmin) return false
    if (currentUserRole === 'admin') return true
    if (currentUserRole === 'project_manager' && currentUserId) {
      const project = projects.find(p => p.id === projectId)
      return project?.managerId === currentUserId
    }
    return false
  }

  const getDayAssignmentId = (assignmentId: number, date: Date) => {
    const dayAssignment = dayAssignments.find(
      (da: any) =>
        da.projectAssignment?.id === assignmentId &&
        isSameDay(new Date(da.date), date)
    )
    return dayAssignment?.id
  }

  const handleDeleteDayAssignment = (assignmentId: number, date: Date, event: React.MouseEvent) => {
    if (!canEditAssignment(assignmentId)) return

    event.preventDefault()
    event.stopPropagation()

    const dayAssignmentId = getDayAssignmentId(assignmentId, date)
    if (!dayAssignmentId) return

    deleteDayAssignmentMutation.mutate(dayAssignmentId)
  }

  // Get priority for a specific date within an assignment
  const getGroupPriority = (assignmentId: number, date: Date): AssignmentPriority => {
    const group = getGroupForDate(assignmentId, date)
    return group?.priority ?? 'normal'
  }

  // Milestone helper functions
  const getMilestoneId = (projectId: number, date: Date) => {
    const milestone = milestones.find(
      (m: Milestone) =>
        m.projectId === projectId &&
        isSameDay(new Date(m.date), date)
    )
    return milestone?.id
  }

  const handleProjectCellClick = (projectId: number, date: Date, _e: React.MouseEvent) => {
    if (!canEditProject(projectId) || viewMode !== 'by-project') return

    _e.preventDefault()
    _e.stopPropagation()

    // Check if there's already a milestone
    const milestoneId = getMilestoneId(projectId, date)
    if (milestoneId) {
      // Delete existing milestone if CTRL/CMD+click or right-click
      if (_e.ctrlKey || _e.metaKey || _e.button === 2) {
        deleteMilestoneMutation.mutate(milestoneId)
      }
    } else {
      // Create new milestone on normal click
      if (!_e.ctrlKey && !_e.metaKey && _e.button === 0) {
        createMilestoneMutation.mutate({
          projectId,
          date: format(date, 'yyyy-MM-dd'),
        })
      }
    }
  }

  // Helper function to get day-off ID for deletion
  const getDayOffId = (memberId: number, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayOff = dayOffs.find(
      (d) => d.teamMemberId === memberId && d.date === dateStr
    )
    return dayOff?.id
  }

  // Handle member cell click for day-off management
  const handleMemberCellClick = (memberId: number, date: Date, _e: React.MouseEvent) => {
    if (!isAdmin || viewMode !== 'by-member') return

    _e.preventDefault()
    _e.stopPropagation()

    // Check if there's already a day-off
    const dayOffId = getDayOffId(memberId, date)
    if (dayOffId) {
      // Delete existing day-off if right-click
      if (_e.button === 2) {
        deleteDayOffMutation.mutate(dayOffId)
      }
    } else {
      // Create new day-off on normal click
      if (_e.button === 0) {
        createDayOffMutation.mutate({
          teamMemberId: memberId,
          date: format(date, 'yyyy-MM-dd'),
        })
      }
    }
  }

  const isDayInDragRange = (assignmentId: number, date: Date) => {
    if (
      dragState.assignmentId !== assignmentId ||
      !dragState.startDate ||
      !dragState.endDate
    ) {
      return false
    }

    const start =
      dragState.startDate < dragState.endDate
        ? dragState.startDate
        : dragState.endDate
    const end =
      dragState.startDate > dragState.endDate
        ? dragState.startDate
        : dragState.endDate

    return date >= start && date <= end
  }


  const hasOverlap = (id: number, date: Date, mode: 'member' | 'project') => {
    if (!showOverlaps) return false

    const count = mode === 'member'
      ? getMemberAssignmentsOnDate(projectAssignments, dayAssignments, id, date)
      : getProjectMembersOnDate(projectAssignments, dayAssignments, id, date)

    return count > 1
  }

  const content = viewMode === 'by-project' ? (
    <TimelineViewContent
      viewMode="by-project"
      items={filteredProjects}
      projects={projects}
      members={filteredMembersWithProjects}
      projectAssignments={projectAssignments}
      dayAssignments={dayAssignments}
      milestones={milestones}
      dayOffs={dayOffs}
      settings={settings}
      assignmentGroups={assignmentGroups}
      dates={dates}
      monthGroups={monthGroups}
      columnWidth={columnWidth}
      zoomLevel={zoomLevel}
      expandedItems={expandedItemsSet}
      onToggleExpand={toggleExpand}
      isAdmin={isAdmin}
      showOverlaps={showOverlaps}
      showTentative={showTentative}
      hideEmptyRows={hideEmptyRows}
      dragState={dragState}
      handleMouseDown={handleMouseDown}
      handleMouseEnter={handleMouseEnter}
      handleAssignmentClick={handleAssignmentClick}
      handleDeleteDayAssignment={handleDeleteDayAssignment}
      handleProjectCellClick={handleProjectCellClick}
      handleMemberCellClick={handleMemberCellClick}
      canEditProject={canEditProject}
      canEditAssignment={canEditAssignment}
      isDayOff={isDayOff}
      isDayInDragRange={isDayInDragRange}
      hasOverlap={hasOverlap}
      getGroupPriority={getGroupPriority}
    />
  ) : (
    <TimelineViewContent
      viewMode="by-member"
      items={filteredMembersWithProjects}
      projects={projects}
      members={filteredMembersWithProjects}
      projectAssignments={projectAssignments}
      dayAssignments={dayAssignments}
      milestones={milestones}
      dayOffs={dayOffs}
      settings={settings}
      assignmentGroups={assignmentGroups}
      dates={dates}
      monthGroups={monthGroups}
      columnWidth={columnWidth}
      zoomLevel={zoomLevel}
      expandedItems={expandedItemsSet}
      onToggleExpand={toggleExpand}
      isAdmin={isAdmin}
      showOverlaps={showOverlaps}
      showTentative={showTentative}
      hideEmptyRows={hideEmptyRows}
      dragState={dragState}
      handleMouseDown={handleMouseDown}
      handleMouseEnter={handleMouseEnter}
      handleAssignmentClick={handleAssignmentClick}
      handleDeleteDayAssignment={handleDeleteDayAssignment}
      handleProjectCellClick={handleProjectCellClick}
      handleMemberCellClick={handleMemberCellClick}
      canEditProject={canEditProject}
      canEditAssignment={canEditAssignment}
      isDayOff={isDayOff}
      isDayInDragRange={isDayInDragRange}
      hasOverlap={hasOverlap}
      getGroupPriority={getGroupPriority}
    />
  )

  return (
    <TooltipProvider>
      {content}

      {/* Holiday/Non-Working Day Warning Dialog */}
      <WarningDialog
        open={!!timelineWarning}
        onOpenChange={() => setTimelineWarning(null)}
        title={timelineWarning?.type === 'holiday' ? 'Holiday Warning' : 'Non-Working Day'}
        message={timelineWarning?.message || ''}
        confirmLabel="Continue Anyway"
        onConfirm={() => {
          timelineWarning?.onConfirm()
        }}
      />

      {/* Assignment Edit Popover */}
      {editPopover && (
        <AssignmentEditPopover
          open={editPopover.open}
          onOpenChange={(open) => {
            if (!open) setEditPopover(null)
          }}
          position={editPopover.position}
          group={editPopover.group}
          projectAssignmentId={editPopover.projectAssignmentId}
          dateRange={editPopover.dateRange}
          onSave={(data) => {
            saveAssignmentGroupMutation.mutate({
              groupId: editPopover.group?.id,
              projectAssignmentId: editPopover.projectAssignmentId,
              startDate: editPopover.dateRange.start,
              endDate: editPopover.dateRange.end,
              priority: data.priority,
              comment: data.comment,
            })
            setEditPopover(null)
          }}
        />
      )}
    </TooltipProvider>
  )
}
