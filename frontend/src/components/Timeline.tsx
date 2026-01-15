import { useRef, useEffect } from 'react'
import { TimelineViewMode, Milestone, DayOff, AssignmentGroup, AssignmentPriority } from '@/types'
import { isHoliday, isWeekend, getHolidayName } from '@/lib/holidays'
import { cn, getInitials, getAvatarColor } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'
import { format, addDays, startOfDay, isSameDay, isFirstDayOfMonth, getDay, getISOWeek } from 'date-fns'
import { enGB } from 'date-fns/locale'
import { ChevronDown, ChevronRight, Clock } from 'lucide-react'
import { WarningDialog } from './ui/warning-dialog'
import { AssignmentEditPopover } from './AssignmentEditPopover'
import { useDragAssignment } from '@/hooks/useDragAssignment'
import { useTimelineWarning } from '@/hooks/useTimelineWarning'
import { useEditPopover } from '@/hooks/useEditPopover'
import { useTimelineData } from '@/hooks/useTimelineData'
import { useTimelineMutations } from '@/hooks/useTimelineMutations'
import { MilestoneIndicator } from './timeline/MilestoneIndicator'
import { DayOffIndicator } from './timeline/DayOffIndicator'
import { CollapsedAssignmentBar } from './timeline/CollapsedAssignmentBar'
import { ExpandedAssignmentBar } from './timeline/ExpandedAssignmentBar'
import {
  ZOOM_COLUMN_WIDTHS,
  DEFAULT_COLUMN_WIDTH,
  type ZoomLevel
} from '@/lib/timeline-constants'
import {
  isDayAssigned,
  isFirstDayOfRange,
  getCommentOverlayWidth,
  getDatePixelOffset,
  getDateFromClickX,
  getMemberAssignmentsOnDate,
  getProjectMembersOnDate
} from '@/lib/timeline-helpers'

interface TimelineProps {
  viewMode: TimelineViewMode
  prevDays: number
  nextDays: number
  isAdmin: boolean
  currentUserId?: number
  currentUserRole?: 'admin' | 'project_manager' | 'user'
  selectedTeamIds: number[]
  zoomLevel: number
  expandedItems: number[]
  onExpandedItemsChange: (items: number[]) => void
  showTentative: boolean
  showWeekends: boolean
  showOverlaps: boolean
}

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
    projects: filteredProjects,
    members: filteredMembersWithProjects,
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

    try {
      const schedule = JSON.parse(member.workSchedule)
      const dayOfWeek = date.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
      // Change from Sunday-first to Monday-first
      const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
      const dayIndex = (dayOfWeek === 0) ? 6 : dayOfWeek - 1  // Convert Sun=0 to index 6
      return !schedule[dayKeys[dayIndex]]
    } catch {
      // If parsing fails, fall back to weekend check
      return isWeekend(date)
    }
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
    createDayAssignmentMutation,
    deleteDayAssignmentMutation,
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
    createDayAssignmentMutation,
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

  // Check if user is specifically an admin (not PM)
  const isActualAdmin = currentUserRole === 'admin'

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

  // Helper function to get the day-off record for a specific member and date
  const getDayOff = (memberId: number, date: Date): DayOff | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return dayOffs.find(
      dayOff => dayOff.teamMemberId === memberId && dayOff.date === dateStr
    )
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

  // Get comment for a specific date within an assignment
  const getGroupComment = (assignmentId: number, date: Date): string | null => {
    const group = getGroupForDate(assignmentId, date)
    return group?.comment ?? null
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

  const handleMemberCellClick = (memberId: number, date: Date, _e: React.MouseEvent) => {
    // Day-offs are admin-only (not for PMs)
    if (!isActualAdmin || viewMode !== 'by-member') return

    _e.preventDefault()
    _e.stopPropagation()

    // Check if there's already a day-off
    const existingDayOff = getDayOff(memberId, date)
    const dateStr = format(date, 'yyyy-MM-dd')

    if (existingDayOff) {
      // Delete existing day-off if CTRL/CMD+click or right-click
      if (_e.ctrlKey || _e.metaKey || _e.button === 2) {
        deleteDayOffMutation.mutate(existingDayOff.id)
      }
    } else {
      // Create new day-off on normal click
      if (!_e.ctrlKey && !_e.metaKey && _e.button === 0) {
        createDayOffMutation.mutate({
          teamMemberId: memberId,
          date: dateStr,
        })
      }
    }
  }

  // Week separator helper - checks if a date should show a week boundary
  const isWeekStart = (date: Date, index: number) => {
    // First visible date always gets a separator
    if (index === 0) return true

    // Monday (getDay returns 1 for Monday) gets a separator
    if (getDay(date) === 1) return true

    // If previous visible date is from a different week (important when weekends are hidden)
    if (index > 0) {
      const prevDate = dates[index - 1]
      if (getISOWeek(prevDate) !== getISOWeek(date)) return true
    }

    return false
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
    <div className="overflow-auto max-h-full">
      <div className="min-w-max">
        {/* Header */}
        <div className="sticky top-0 bg-background z-30 shadow-sm">
          {/* Month labels row */}
          <div className="flex border-b">
              <div className="w-64 border-r bg-muted/30"></div>
              {monthGroups.map((group, idx) => {
                // Calculate width based on column count and zoom level
                const pixelWidths = { 1: 40, 2: 48, 3: 64, 4: 80 }
                const pixelWidth = pixelWidths[zoomLevel as keyof typeof pixelWidths] || 64
                const totalWidth = group.count * pixelWidth

                return (
                  <div
                    key={idx}
                    style={{ width: `${totalWidth}px` }}
                    className={cn(
                      'p-2 text-center font-semibold text-sm bg-muted/50 border-r',
                      isFirstDayOfMonth(group.firstDate) && 'border-l-4 border-l-border'
                    )}
                  >
                    {group.month}
                  </div>
                )
              })}
            </div>
            {/* Date row */}
            <div className="flex border-b-2">
            <div className="w-64 p-3 font-semibold border-r bg-muted/30">Projects</div>
            {dates.map((date, dateIndex) => (
              <div
                key={date.toISOString()}
                className={cn(
                  columnWidth, 'p-2 text-center text-sm border-r',
                  isWeekend(date) && 'bg-weekend',
                  isHoliday(date) && 'bg-holiday',
                  isSameDay(date, today) && 'bg-primary/10 border-x-2 border-x-primary font-bold',
                  isFirstDayOfMonth(date) && 'border-l-4 border-l-border',
                  isWeekStart(date, dateIndex) && !isFirstDayOfMonth(date) && 'border-l-4 border-l-muted-foreground'
                )}
              >
                <div className={cn('font-medium', isSameDay(date, today) && 'text-primary')}>
                  {format(date, 'EEE', { locale: enGB })}
                </div>
                <div className={cn('text-xs', isSameDay(date, today) ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                  {format(date, 'dd.MM')}
                </div>
                {isSameDay(date, today) && (
                  <div className="text-xs text-primary font-semibold">
                    {zoomLevel <= 2 ? 'TDY' : 'TODAY'}
                  </div>
                )}
                {isHoliday(date) && (
                  <div className="text-xs text-purple-700 dark:text-purple-400 font-medium truncate px-1">
                    {getHolidayName(date)}
                  </div>
                )}
              </div>
            ))}
            </div>
          </div>

          {/* Projects */}
          {filteredProjects.map((project) => {
            const assignments = projectAssignments.filter(
              (pa: any) => pa.projectId === project.id
            )

            return (
              <div key={project.id}>
                <div
                  className="flex border-b-4 border-border bg-muted/70 hover:bg-muted/90 cursor-pointer transition-colors"
                  onClick={() => toggleExpand(project.id)}
                >
                  <div className="w-64 p-3 border-r-2 border-border bg-background/50 flex items-center gap-2">
                    {expandedItemsSet.has(project.id) ? (
                      <ChevronDown className="h-4 w-4 text-primary" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div
                      className={cn(
                        'flex-1',
                        project.status === 'tentative' && 'opacity-50'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-sm">{project.name}</div>
                        {project.status === 'tentative' ? (
                          <div
                            className={cn('flex items-center text-sm font-medium text-slate-700 dark:text-slate-300')}
                          >
                              <Clock className="h-3 w-3" />
                          </div>
                        ) : (
                          ""
                        )}
                      </div>
                      <div className="text-xs">
                        {project.customer?.icon && `${project.customer.icon} `}
                        {project.customer?.name}
                      </div>
                    </div>
                  </div>
                  {dates.map((date, dateIndex) => (
                    <Tooltip key={date.toISOString()}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            columnWidth, 'border-r relative flex items-center justify-center',
                            isWeekend(date) && 'bg-weekend',
                            isHoliday(date) && 'bg-holiday',
                            isSameDay(date, today) && 'bg-primary/10 border-x-2 border-x-primary',
                            isFirstDayOfMonth(date) && 'border-l-4 border-l-border',
                            isWeekStart(date, dateIndex) && !isFirstDayOfMonth(date) && 'border-l-4 border-l-muted-foreground',
                            canEditProject(project.id) && 'cursor-pointer'
                          )}
                          onClick={(e) => handleProjectCellClick(project.id, date, e)}
                          onContextMenu={(e) => handleProjectCellClick(project.id, date, e)}
                        >
                          <MilestoneIndicator
                            projectId={project.id}
                            date={date}
                            milestones={milestones}
                            canEdit={canEditProject(project.id)}
                            onToggle={handleProjectCellClick}
                          />
                          {!expandedItemsSet.has(project.id) && (
                            <CollapsedAssignmentBar
                              type="project"
                              id={project.id}
                              date={date}
                              projectAssignments={projectAssignments}
                              dayAssignments={dayAssignments}
                              isTentative={project.status === 'tentative'}
                              hasOverlap={false}
                              showOverlaps={false}
                            />
                          )}
                        </div>
                      </TooltipTrigger>
                      {canEditProject(project.id) && (
                        <TooltipContent side="top" className="text-xs">
                          Add/remove milestone 🚩
                        </TooltipContent>
                      )}
                    </Tooltip>
                  ))}
                </div>

                {expandedItemsSet.has(project.id) &&
                  assignments.map((assignment: any) => {
                    const member = members.find(
                      (m) => m.id === assignment.teamMemberId
                    )
                    if (!member) return null

                    return (
                      <div key={assignment.id} className="flex border-b bg-background/30 hover:bg-muted/20 transition-colors relative">
                        <div className="w-64 p-2.5 pl-10 border-r flex items-center gap-2 bg-background/50">
                          <Avatar className="h-6 w-6 ring-1 ring-border/50">
                            <AvatarImage src={member.avatarUrl || undefined} />
                            <AvatarFallback
                              className="text-xs"
                              style={{
                                backgroundColor: getAvatarColor(member.firstName, member.lastName).bg,
                                color: getAvatarColor(member.firstName, member.lastName).text,
                              }}
                            >
                              {getInitials(member.firstName, member.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {member.firstName} {member.lastName}
                          </span>
                        </div>
                        {dates.map((date, dateIndex) => (
                          <div
                            key={date.toISOString()}
                            className={cn(
                              columnWidth, 'border-r group relative flex items-center justify-center select-none',
                              isWeekend(date) && 'bg-weekend',
                              isHoliday(date) && 'bg-holiday',
                              isDayOff(member.id, date) && 'bg-dayOff',
                              isSameDay(date, today) && 'bg-primary/10 border-x-2 border-x-primary',
                              isAdmin && 'cursor-pointer',
                              isFirstDayOfMonth(date) && 'border-l-4 border-l-border',
                              isWeekStart(date, dateIndex) && !isFirstDayOfMonth(date) && 'border-l-4 border-l-muted-foreground'
                            )}
                            onMouseDown={(_e) =>
                              handleMouseDown(assignment.id, date, _e)
                            }
                            onMouseEnter={() => handleMouseEnter(date)}
                            onClick={(e) => {
                              if ((e.ctrlKey || e.metaKey) && isDayAssigned(dayAssignments, assignment.id, date)) {
                                handleDeleteDayAssignment(assignment.id, date, e)
                              }
                            }}
                            onContextMenu={(_e) => {
                              _e.preventDefault() // Prevent browser context menu
                              if (isDayAssigned(dayAssignments, assignment.id, date)) {
                                handleDeleteDayAssignment(assignment.id, date, _e)
                              }
                            }}
                          >
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <span className="text-xs text-muted-foreground/40 dark:text-muted-foreground/60 font-medium">
                                {format(date, 'EEE', { locale: enGB })}
                              </span>
                            </div>
                            <ExpandedAssignmentBar
                              assignmentId={assignment.id}
                              date={date}
                              projectAssignments={projectAssignments}
                              dayAssignments={dayAssignments}
                              project={project}
                              isDayInDragRange={isDayInDragRange(assignment.id, date)}
                              isAdmin={isAdmin}
                              hasOverlap={hasOverlap(member.id, date, 'member')}
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                if (isDayAssigned(dayAssignments, assignment.id, date)) {
                                  handleAssignmentClick(assignment.id, date, e)
                                }
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault()
                                if (isDayAssigned(dayAssignments, assignment.id, date)) {
                                  handleDeleteDayAssignment(assignment.id, date, e)
                                }
                              }}
                              getGroupPriority={getGroupPriority}
                            />
                          </div>
                        ))}
                        {/* Comment overlay rendered at row level to appear above all bar segments */}
                        {(() => {
                          // Find all contiguous ranges with comments for this assignment
                          const commentRanges: { date: Date; comment: string }[] = []
                          dates.forEach(date => {
                            if (isDayAssigned(dayAssignments, assignment.id, date) && isFirstDayOfRange(dayAssignments, assignment.id, date)) {
                              const comment = getGroupComment(assignment.id, date)
                              if (comment) {
                                commentRanges.push({ date, comment })
                              }
                            }
                          })
                          return commentRanges.map(({ date, comment }) => (
                            <Tooltip key={`comment-${date.toISOString()}`}>
                              <TooltipTrigger asChild>
                                <div
                                  className="absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[9px] leading-none pointer-events-auto cursor-pointer overflow-hidden z-20"
                                  style={{
                                    left: 256 + getDatePixelOffset(dates, date, zoomLevel as ZoomLevel) + 4, // 256px = w-64 sidebar, +4 for padding
                                    width: getCommentOverlayWidth(dayAssignments, dates, assignment.id, date, zoomLevel as ZoomLevel),
                                  }}
                                  onClick={(e) => {
                                    // Find the actual date clicked based on X position
                                    const row = e.currentTarget.closest('.relative') as HTMLElement
                                    if (row) {
                                      const clickedDate = getDateFromClickX(dates, e.clientX, row, zoomLevel as ZoomLevel)
                                      if (clickedDate && isDayAssigned(dayAssignments, assignment.id, clickedDate)) {
                                        handleAssignmentClick(assignment.id, clickedDate, e)
                                      }
                                    }
                                  }}
                                  onContextMenu={(e) => {
                                    e.preventDefault()
                                    // Find the actual date clicked based on X position
                                    const row = e.currentTarget.closest('.relative') as HTMLElement
                                    if (row) {
                                      const clickedDate = getDateFromClickX(dates, e.clientX, row, zoomLevel as ZoomLevel)
                                      if (clickedDate && isDayAssigned(dayAssignments, assignment.id, clickedDate)) {
                                        handleDeleteDayAssignment(assignment.id, clickedDate, e)
                                      }
                                    }
                                  }}
                                >
                                  <span className="flex-shrink-0">💬</span>
                                  <span className="truncate text-foreground/70 font-medium">
                                    {comment}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">💬 {comment}</p>
                                {getGroupPriority(assignment.id, date) === 'high' && (
                                  <p className="max-w-xs">
                                    {'🔥 high priority'}
                                  </p>
                                )}
                                {getGroupPriority(assignment.id, date) === 'low' && (
                                  <p className="max-w-xs">
                                    {'🤷‍♂️ low priority'}
                                  </p>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          ))
                        })()}
                      </div>
                    )
                  })}
              </div>
            )
          })}
      </div>
    </div>
  ) : (
    // By Member view
    <div className="overflow-auto max-h-full">
      <div className="min-w-max">
        {/* Header */}
        <div className="sticky top-0 bg-background z-30 shadow-sm">
          {/* Month labels row */}
          <div className="flex border-b">
            <div className="w-64 border-r bg-muted/30"></div>
            {monthGroups.map((group, idx) => {
              // Calculate width based on column count and zoom level
              const pixelWidths = { 1: 40, 2: 48, 3: 64, 4: 80 }
              const pixelWidth = pixelWidths[zoomLevel as keyof typeof pixelWidths] || 64
              const totalWidth = group.count * pixelWidth

              return (
                <div
                  key={idx}
                  style={{ width: `${totalWidth}px` }}
                  className={cn(
                    'p-2 text-center font-semibold text-sm bg-muted/50 border-r',
                    isFirstDayOfMonth(group.firstDate) && 'border-l-4 border-l-border'
                  )}
                >
                  {group.month}
                </div>
              )
            })}
          </div>
          {/* Date row */}
          <div className="flex border-b-2">
          <div className="w-64 p-3 font-semibold border-r bg-muted/30">Team Members</div>
          {dates.map((date, dateIndex) => (
            <div
              key={date.toISOString()}
              className={cn(
                columnWidth, 'p-2 text-center text-sm border-r',
                isWeekend(date) && 'bg-weekend',
                isHoliday(date) && 'bg-holiday',
                isSameDay(date, today) && 'bg-primary/10 border-x-2 border-x-primary font-bold',
                isFirstDayOfMonth(date) && 'border-l-4 border-l-border',
                isWeekStart(date, dateIndex) && !isFirstDayOfMonth(date) && 'border-l-4 border-l-muted-foreground'
              )}
            >
              <div className={cn('font-medium', isSameDay(date, today) && 'text-primary')}>
                {format(date, 'EEE', { locale: enGB })}
              </div>
              <div className={cn('text-xs', isSameDay(date, today) ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                {format(date, 'dd.MM')}
              </div>
              {isSameDay(date, today) && (
                <div className="text-xs text-primary font-semibold">
                  {zoomLevel <= 2 ? 'TDY' : 'TODAY'}
                </div>
              )}
              {isHoliday(date) && (
                <div className="text-xs text-purple-700 dark:text-purple-400 font-medium truncate px-1">
                  {getHolidayName(date)}
                </div>
              )}
            </div>
          ))}
          </div>
        </div>

        {/* Members */}
        {filteredMembersWithProjects.map((member) => {
          const assignments = projectAssignments.filter(
            (pa: any) => pa.teamMemberId === member.id
          )

          return (
            <div key={member.id}>
              <div
                className="flex border-b-4 border-border bg-muted/70 hover:bg-muted/90 cursor-pointer transition-colors"
                onClick={() => toggleExpand(member.id)}
              >
                <div className="w-64 p-3 border-r-2 border-border bg-background/50 flex items-center gap-2">
                  {expandedItemsSet.has(member.id) ? (
                    <ChevronDown className="h-4 w-4 text-primary" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Avatar className="h-8 w-8 ring-2 ring-border/50">
                    <AvatarImage src={member.avatarUrl || undefined} />
                    <AvatarFallback
                      style={{
                        backgroundColor: getAvatarColor(member.firstName, member.lastName).bg,
                        color: getAvatarColor(member.firstName, member.lastName).text,
                      }}
                    >
                      {getInitials(member.firstName, member.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-semibold text-sm">
                    {member.firstName} {member.lastName}
                  </span>
                </div>
                {dates.map((date, dateIndex) => (
                  <Tooltip key={date.toISOString()}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          columnWidth, 'border-r relative flex items-center justify-center',
                          isWeekend(date) && 'bg-weekend',
                          isHoliday(date) && 'bg-holiday',
                          isDayOff(member.id, date) && 'bg-dayOff',
                          isSameDay(date, today) && 'bg-primary/10 border-x-2 border-x-primary',
                          isFirstDayOfMonth(date) && 'border-l-4 border-l-border',
                          isWeekStart(date, dateIndex) && !isFirstDayOfMonth(date) && 'border-l-4 border-l-muted-foreground',
                          isActualAdmin && 'cursor-pointer'
                        )}
                        onClick={(e) => handleMemberCellClick(member.id, date, e)}
                        onContextMenu={(e) => handleMemberCellClick(member.id, date, e)}
                      >
                        <DayOffIndicator
                          memberId={member.id}
                          date={date}
                          dayOffs={dayOffs}
                        />
                        {!expandedItemsSet.has(member.id) && (
                          <CollapsedAssignmentBar
                            type="member"
                            id={member.id}
                            date={date}
                            projectAssignments={projectAssignments}
                            dayAssignments={dayAssignments}
                            projects={projects}
                            hasOverlap={hasOverlap(member.id, date, 'member')}
                            showOverlaps={showOverlaps}
                          />
                        )}
                      </div>
                    </TooltipTrigger>
                    {isActualAdmin && (
                      <TooltipContent side="top" className="text-xs">
                        Add/remove day off 🏝️
                      </TooltipContent>
                    )}
                  </Tooltip>
                ))}
              </div>

              {expandedItemsSet.has(member.id) &&
                assignments.map((assignment: any) => {
                  const project = projects.find(
                    (p) => p.id === assignment.projectId
                  )
                  if (!project) return null

                  // Hide tentative projects if showTentative is disabled
                  if (!showTentative && project.status === 'tentative') return null

                  return (
                    <div key={assignment.id} className="flex border-b bg-background/30 hover:bg-muted/20 transition-colors relative">
                      <div
                        className={cn(
                          'w-64 p-2 pl-10 border-r bg-background/50',
                          project.status === 'tentative' && 'opacity-50'
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="text-sm font-medium">{project.name}</div>
                          {project.status === 'tentative' ? (
                            <div
                              className={cn('flex items-center text-sm font-medium text-slate-700 dark:text-slate-300')}
                            >
                                <Clock className="h-2.5 w-2.5" />
                            </div>
                          ) : (
                            ""
                          )}
                        </div>
                        <div className="text-xs">
                          {project.customer?.icon && `${project.customer.icon} `}
                          {project.customer?.name}
                        </div>
                      </div>
                      {dates.map((date, dateIndex) => (
                        <div
                          key={date.toISOString()}
                          className={cn(
                            columnWidth, 'border-r group relative flex items-center justify-center select-none',
                            isWeekend(date) && 'bg-weekend',
                            isHoliday(date) && 'bg-holiday',
                            isDayOff(member.id, date) && 'bg-dayOff',
                            isSameDay(date, today) && 'bg-primary/10 border-x-2 border-x-primary',
                            isAdmin && 'cursor-pointer',
                            isFirstDayOfMonth(date) && 'border-l-4 border-l-border',
                            isWeekStart(date, dateIndex) && !isFirstDayOfMonth(date) && 'border-l-4 border-l-muted-foreground'
                          )}
                                                      onMouseDown={(_e) =>
                                                        handleMouseDown(assignment.id, date, _e)                          }
                          onMouseEnter={() => handleMouseEnter(date)}
                          onClick={(e) => {
                            if ((e.ctrlKey || e.metaKey) && isDayAssigned(dayAssignments, assignment.id, date)) {
                              handleDeleteDayAssignment(assignment.id, date, e)
                            }
                          }}
                                                      onContextMenu={(_e) => {
                                                        _e.preventDefault() // Prevent browser context menu
                                                        if (isDayAssigned(dayAssignments, assignment.id, date)) {
                                                          handleDeleteDayAssignment(assignment.id, date, _e)
                                                        }
                                                      }}                        >
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <span className="text-xs text-muted-foreground/40 dark:text-muted-foreground/80 font-medium">
                              {format(date, 'EEE', { locale: enGB })}
                            </span>
                          </div>
                          <MilestoneIndicator
                            projectId={project.id}
                            date={date}
                            milestones={milestones}
                            canEdit={canEditProject(project.id)}
                            onToggle={handleProjectCellClick}
                          />
                          <ExpandedAssignmentBar
                            assignmentId={assignment.id}
                            date={date}
                            projectAssignments={projectAssignments}
                            dayAssignments={dayAssignments}
                            project={project}
                            isDayInDragRange={isDayInDragRange(assignment.id, date)}
                            isAdmin={isAdmin}
                            hasOverlap={false}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              if (isDayAssigned(dayAssignments, assignment.id, date)) {
                                handleAssignmentClick(assignment.id, date, e)
                              }
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault()
                              if (isDayAssigned(dayAssignments, assignment.id, date)) {
                                handleDeleteDayAssignment(assignment.id, date, e)
                              }
                            }}
                            getGroupPriority={getGroupPriority}
                          />
                        </div>
                      ))}
                      {/* Comment overlay rendered at row level to appear above all bar segments */}
                      {(() => {
                        // Find all contiguous ranges with comments for this assignment
                        const commentRanges: { date: Date; comment: string }[] = []
                        dates.forEach(date => {
                          if (isDayAssigned(dayAssignments, assignment.id, date) && isFirstDayOfRange(dayAssignments, assignment.id, date)) {
                            const comment = getGroupComment(assignment.id, date)
                            if (comment) {
                              commentRanges.push({ date, comment })
                            }
                          }
                        })
                        return commentRanges.map(({ date, comment }) => (
                          <Tooltip key={`comment-${date.toISOString()}`}>
                            <TooltipTrigger asChild>
                              <div
                                className="absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[9px] leading-none pointer-events-auto cursor-pointer overflow-hidden z-20"
                                style={{
                                  left: 256 + getDatePixelOffset(dates, date, zoomLevel as ZoomLevel) + 4, // 256px = w-64 sidebar, +4 for padding
                                  width: getCommentOverlayWidth(dayAssignments, dates, assignment.id, date, zoomLevel as ZoomLevel),
                                }}
                                onClick={(e) => {
                                  // Find the actual date clicked based on X position
                                  const row = e.currentTarget.closest('.relative') as HTMLElement
                                  if (row) {
                                    const clickedDate = getDateFromClickX(dates, e.clientX, row, zoomLevel as ZoomLevel)
                                    if (clickedDate && isDayAssigned(dayAssignments, assignment.id, clickedDate)) {
                                      handleAssignmentClick(assignment.id, clickedDate, e)
                                    }
                                  }
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault()
                                  // Find the actual date clicked based on X position
                                  const row = e.currentTarget.closest('.relative') as HTMLElement
                                  if (row) {
                                    const clickedDate = getDateFromClickX(dates, e.clientX, row, zoomLevel as ZoomLevel)
                                    if (clickedDate && isDayAssigned(dayAssignments, assignment.id, clickedDate)) {
                                      handleDeleteDayAssignment(assignment.id, clickedDate, e)
                                    }
                                  }
                                }}
                              >
                                <span className="flex-shrink-0">💬</span>
                                <span className="truncate text-foreground/70 font-medium">
                                  {comment}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">💬 {comment}</p>
                              {getGroupPriority(assignment.id, date) === 'high' && (
                                <p className="max-w-xs">
                                  {'🔥 high priority'}
                                </p>
                              )}
                              {getGroupPriority(assignment.id, date) === 'low' && (
                                <p className="max-w-xs">
                                  {'🤷‍♂️ low priority'}
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        ))
                      })()}
                    </div>
                  )
                })}
            </div>
          )
        })}
      </div>
    </div>
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
