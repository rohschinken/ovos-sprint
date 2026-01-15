import { useRef, useEffect } from 'react'
import { TimelineViewMode, Milestone, AssignmentGroup, AssignmentPriority } from '@/types'
import { isHoliday, isWeekend } from '@/lib/holidays'
import { cn, getInitials, getAvatarColor } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar'
import { TooltipProvider } from './ui/tooltip'
import { format, addDays, startOfDay, isSameDay, isFirstDayOfMonth, getDay, getISOWeek } from 'date-fns'
import { enGB } from 'date-fns/locale'
import { Clock } from 'lucide-react'
import { WarningDialog } from './ui/warning-dialog'
import { AssignmentEditPopover } from './AssignmentEditPopover'
import { useDragAssignment } from '@/hooks/useDragAssignment'
import { useTimelineWarning } from '@/hooks/useTimelineWarning'
import { useEditPopover } from '@/hooks/useEditPopover'
import { useTimelineData } from '@/hooks/useTimelineData'
import { useTimelineMutations } from '@/hooks/useTimelineMutations'
import { MilestoneIndicator } from './timeline/MilestoneIndicator'
import { ExpandedAssignmentBar } from './timeline/ExpandedAssignmentBar'
import { AssignmentCommentOverlay } from './timeline/AssignmentCommentOverlay'
import { TimelineHeader } from './timeline/TimelineHeader'
import { TimelineItemHeader } from './timeline/TimelineItemHeader'
import {
  ZOOM_COLUMN_WIDTHS,
  DEFAULT_COLUMN_WIDTH,
  type ZoomLevel
} from '@/lib/timeline-constants'
import {
  isDayAssigned,
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
        <TimelineHeader
          dates={dates}
          monthGroups={monthGroups}
          columnWidth={columnWidth}
          zoomLevel={zoomLevel}
        />

          {/* Projects */}
          {filteredProjects.map((project) => {
            const assignments = projectAssignments.filter(
              (pa: any) => pa.projectId === project.id
            )

            return (
              <div key={project.id}>
                <TimelineItemHeader
                  type="project"
                  item={project}
                  isExpanded={expandedItemsSet.has(project.id)}
                  canEdit={canEditProject(project.id)}
                  onToggleExpand={toggleExpand}
                  dates={dates}
                  columnWidth={columnWidth}
                  milestones={milestones}
                  onMilestoneToggle={handleProjectCellClick}
                />

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
                        <AssignmentCommentOverlay
                          assignmentId={assignment.id}
                          dates={dates}
                          dayAssignments={dayAssignments}
                          assignmentGroups={assignmentGroups}
                          zoomLevel={zoomLevel}
                          onCommentClick={(assignmentId, date, e) => {
                            handleAssignmentClick(assignmentId, date, e)
                          }}
                          onCommentContextMenu={(assignmentId, date, e) => {
                            handleDeleteDayAssignment(assignmentId, date, e)
                          }}
                        />
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
        <TimelineHeader
          dates={dates}
          monthGroups={monthGroups}
          columnWidth={columnWidth}
          zoomLevel={zoomLevel}
          label="Team Members"
        />

        {/* Members */}
        {filteredMembersWithProjects.map((member) => {
          const assignments = projectAssignments.filter(
            (pa: any) => pa.teamMemberId === member.id
          )

          return (
            <div key={member.id}>
              <TimelineItemHeader
                type="member"
                item={member}
                isExpanded={expandedItemsSet.has(member.id)}
                canEdit={false}
                onToggleExpand={toggleExpand}
                dates={dates}
                columnWidth={columnWidth}
              />

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
                      <AssignmentCommentOverlay
                        assignmentId={assignment.id}
                        dates={dates}
                        dayAssignments={dayAssignments}
                        assignmentGroups={assignmentGroups}
                        zoomLevel={zoomLevel}
                        onCommentClick={(assignmentId, date, e) => {
                          handleAssignmentClick(assignmentId, date, e)
                        }}
                        onCommentContextMenu={(assignmentId, date, e) => {
                          handleDeleteDayAssignment(assignmentId, date, e)
                        }}
                      />
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
