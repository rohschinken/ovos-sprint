import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/client'
import { TimelineViewMode, Project, TeamMember, DayAssignment } from '@/types'
import { isHoliday, isWeekend, getHolidayName } from '@/lib/holidays'
import { cn, getInitials, getAvatarColor } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { format, addDays, startOfDay, isSameDay, startOfMonth, isFirstDayOfMonth } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface TimelineProps {
  viewMode: TimelineViewMode
  prevDays: number
  nextDays: number
  isAdmin: boolean
  selectedTeamIds: number[]
  zoomLevel: number
  expandedItems: number[]
  onExpandedItemsChange: (items: number[]) => void
  hideTentative: boolean
}

export default function Timeline({
  viewMode,
  prevDays,
  nextDays,
  isAdmin,
  selectedTeamIds,
  zoomLevel,
  expandedItems: expandedItemsProp,
  onExpandedItemsChange,
  hideTentative,
}: TimelineProps) {
  const [dragState, setDragState] = useState<{
    assignmentId: number | null
    startDate: Date | null
    endDate: Date | null
  }>({ assignmentId: null, startDate: null, endDate: null })

  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Convert expandedItems array to Set for easier manipulation
  const expandedItemsSet = new Set(expandedItemsProp)

  // Column width based on zoom level (1=compact, 2=narrow, 3=normal, 4=wide)
  const columnWidths = {
    1: 'w-12', // 48px - Compact
    2: 'w-16', // 64px - Narrow
    3: 'w-20', // 80px - Normal
    4: 'w-24', // 96px - Wide
  }
  const columnWidth = columnWidths[zoomLevel as keyof typeof columnWidths] || 'w-16'

  // Generate dates
  const today = startOfDay(new Date())
  const startDate = addDays(today, -prevDays)
  const dates: Date[] = []
  for (let i = 0; i <= prevDays + nextDays; i++) {
    dates.push(addDays(startDate, i))
  }

  // Group dates by month for month labels
  const monthGroups: { month: string; count: number; firstDate: Date }[] = []
  let currentMonth = ''
  let currentCount = 0
  let currentFirstDate: Date | null = null

  dates.forEach((date) => {
    const monthKey = format(date, 'MMMM yyyy', { locale: enUS })
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

  // Fetch data
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await api.get('/projects')
      return response.data as Project[]
    },
  })

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const response = await api.get('/members')
      return response.data as TeamMember[]
    },
  })

  const { data: projectAssignments = [] } = useQuery({
    queryKey: ['assignments', 'projects'],
    queryFn: async () => {
      const response = await api.get('/assignments/projects')
      return response.data
    },
  })

  const { data: dayAssignments = [] } = useQuery({
    queryKey: [
      'assignments',
      'days',
      format(startDate, 'yyyy-MM-dd'),
      format(dates[dates.length - 1], 'yyyy-MM-dd'),
    ],
    queryFn: async () => {
      const response = await api.get('/assignments/days', {
        params: {
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(dates[dates.length - 1], 'yyyy-MM-dd'),
        },
      })
      return response.data
    },
  })

  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await api.get('/settings')
      return response.data as Record<string, string>
    },
  })

  const { data: teamMemberRelationships = [] } = useQuery({
    queryKey: ['teams', 'members', 'relationships'],
    queryFn: async () => {
      const response = await api.get('/teams/members/relationships')
      return response.data as { teamId: number; teamMemberId: number }[]
    },
  })

  // Filter members based on selected teams
  const filteredMembers =
    selectedTeamIds.length === 0
      ? members
      : members.filter((member) =>
          teamMemberRelationships.some(
            (rel) =>
              rel.teamMemberId === member.id &&
              selectedTeamIds.includes(rel.teamId)
          )
        )

  // Filter projects based on selected teams (show only projects with members from selected teams)
  const filteredProjectsWithTeam =
    selectedTeamIds.length === 0
      ? projects
      : projects.filter((project) => {
          // Get all assignments for this project
          const projectAssignmentsForProject = projectAssignments.filter(
            (pa: any) => pa.projectId === project.id
          )
          // Check if any of these assignments have members from the selected teams
          return projectAssignmentsForProject.some((assignment: any) => {
            const member = members.find((m) => m.id === assignment.teamMemberId)
            if (!member) return false
            return teamMemberRelationships.some(
              (rel) =>
                rel.teamMemberId === member.id &&
                selectedTeamIds.includes(rel.teamId)
            )
          })
        })

  // Filter out projects without members
  const filteredProjectsWithMembers = filteredProjectsWithTeam.filter((project) => {
    const assignments = projectAssignments.filter(
      (pa: any) => pa.projectId === project.id
    )
    return assignments.length > 0
  })

  // Filter out tentative projects if hideTentative is true
  const filteredProjects = hideTentative
    ? filteredProjectsWithMembers.filter((project) => project.status === 'confirmed')
    : filteredProjectsWithMembers

  // Filter out members without projects
  const filteredMembersWithProjects = filteredMembers.filter((member) => {
    const assignments = projectAssignments.filter(
      (pa: any) => pa.teamMemberId === member.id
    )
    // If hideTentative is true, only count confirmed project assignments
    if (hideTentative) {
      const confirmedAssignments = assignments.filter((pa: any) => {
        const project = projects.find((p) => p.id === pa.projectId)
        return project && project.status === 'confirmed'
      })
      return confirmedAssignments.length > 0
    }
    return assignments.length > 0
  })

  // Initialize all items as expanded by default (when no saved preferences)
  useEffect(() => {
    if (expandedItemsProp.length === 0 && (filteredProjects.length > 0 || filteredMembersWithProjects.length > 0)) {
      const allIds = viewMode === 'by-project'
        ? filteredProjects.map((p) => p.id)
        : filteredMembersWithProjects.map((m) => m.id)
      onExpandedItemsChange(allIds)
    }
  }, [filteredProjects, filteredMembersWithProjects, viewMode]) // Only run when data loads or view mode changes

  const createDayAssignmentMutation = useMutation({
    mutationFn: async (data: {
      projectAssignmentId: number
      date: string
    }) => {
      const response = await api.post('/assignments/days', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', 'days'] })
    },
  })

  const deleteDayAssignmentMutation = useMutation({
    mutationFn: async (dayAssignmentId: number) => {
      await api.delete(`/assignments/days/${dayAssignmentId}`)
    },
    onSuccess: async () => {
      // Force immediate refetch of day assignments
      await queryClient.refetchQueries({
        queryKey: ['assignments', 'days'],
        type: 'all'
      })
      toast({ title: 'Assignment deleted' })
    },
  })

  const toggleExpand = (id: number) => {
    const newExpandedSet = new Set(expandedItemsProp)
    if (newExpandedSet.has(id)) {
      newExpandedSet.delete(id)
    } else {
      newExpandedSet.add(id)
    }
    onExpandedItemsChange(Array.from(newExpandedSet))
  }

  const handleMouseDown = (assignmentId: number, date: Date) => {
    if (!isAdmin) return

    const warnWeekend = settings.warnWeekendAssignments !== 'false'
    if (warnWeekend && (isWeekend(date) || isHoliday(date))) {
      const holidayName = getHolidayName(date)
      const message = holidayName
        ? `This is a holiday (${holidayName}). Are you sure?`
        : 'This is a weekend. Are you sure?'

      if (!confirm(message)) {
        return
      }
    }

    setDragState({
      assignmentId,
      startDate: date,
      endDate: date,
    })
  }

  const handleMouseEnter = (date: Date) => {
    if (dragState.assignmentId && dragState.startDate) {
      setDragState({
        ...dragState,
        endDate: date,
      })
    }
  }

  const handleMouseUp = () => {
    if (
      dragState.assignmentId &&
      dragState.startDate &&
      dragState.endDate
    ) {
      const start =
        dragState.startDate < dragState.endDate
          ? dragState.startDate
          : dragState.endDate
      const end =
        dragState.startDate > dragState.endDate
          ? dragState.startDate
          : dragState.endDate

      const daysDiff = Math.floor(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      )

      for (let i = 0; i <= daysDiff; i++) {
        const date = addDays(start, i)
        createDayAssignmentMutation.mutate({
          projectAssignmentId: dragState.assignmentId,
          date: format(date, 'yyyy-MM-dd'),
        })
      }
    }

    setDragState({ assignmentId: null, startDate: null, endDate: null })
  }

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragState.assignmentId) {
        handleMouseUp()
      }
    }

    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [dragState])

  const isDayAssigned = (assignmentId: number, date: Date) => {
    return dayAssignments.some(
      (da: any) =>
        da.projectAssignment?.id === assignmentId &&
        isSameDay(new Date(da.date), date)
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
    if (!isAdmin) return

    event.preventDefault()
    event.stopPropagation()

    const dayAssignmentId = getDayAssignmentId(assignmentId, date)
    if (!dayAssignmentId) return

    deleteDayAssignmentMutation.mutate(dayAssignmentId)
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

  // Check if a member has overlapping assignments on a date (for by-member view)
  const getMemberAssignmentsOnDate = (memberId: number, date: Date) => {
    const memberAssignments = projectAssignments.filter(
      (pa: any) => pa.teamMemberId === memberId
    )

    return memberAssignments.filter((assignment: any) =>
      isDayAssigned(assignment.id, date)
    ).length
  }

  // Check if a project has overlapping members on a date (for by-project view)
  const getProjectMembersOnDate = (projectId: number, date: Date) => {
    const projAssignments = projectAssignments.filter(
      (pa: any) => pa.projectId === projectId
    )

    return projAssignments.filter((assignment: any) =>
      isDayAssigned(assignment.id, date)
    ).length
  }

  // Check if a project has ANY assignments on a date (for collapsed view)
  const projectHasAssignmentOnDate = (projectId: number, date: Date) => {
    return getProjectMembersOnDate(projectId, date) > 0
  }

  // Check if a member has ANY assignments on a date (for collapsed view)
  const memberHasAssignmentOnDate = (memberId: number, date: Date) => {
    return getMemberAssignmentsOnDate(memberId, date) > 0
  }

  // Check if a member has any confirmed assignments on a date
  const memberHasConfirmedAssignmentOnDate = (memberId: number, date: Date) => {
    const memberAssignments = projectAssignments.filter(
      (pa: any) => pa.teamMemberId === memberId
    )

    return memberAssignments.some((assignment: any) => {
      if (!isDayAssigned(assignment.id, date)) return false
      const project = projects.find((p) => p.id === assignment.projectId)
      return project && project.status === 'confirmed'
    })
  }

  const hasOverlap = (id: number, date: Date, mode: 'member' | 'project') => {
    if (settings.showOverlapVisualization === 'false') return false

    const count = mode === 'member'
      ? getMemberAssignmentsOnDate(id, date)
      : getProjectMembersOnDate(id, date)

    return count > 1
  }

  if (viewMode === 'by-project') {
    return (
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Header */}
          <div className="sticky top-0 bg-background z-10 shadow-sm">
            {/* Month labels row */}
            <div className="flex border-b">
              <div className="w-64 border-r bg-muted/30"></div>
              {monthGroups.map((group, idx) => {
                // Calculate width based on column count and zoom level
                const pixelWidths = { 1: 48, 2: 64, 3: 80, 4: 96 }
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
            <div className="w-64 p-3 font-semibold border-r bg-muted/30">Project</div>
            {dates.map((date) => (
              <div
                key={date.toISOString()}
                className={cn(
                  columnWidth, 'p-2 text-center text-sm border-r',
                  isWeekend(date) && 'bg-weekend',
                  isHoliday(date) && 'bg-holiday',
                  isSameDay(date, today) && 'bg-primary/10 border-x-2 border-x-primary font-bold',
                  isFirstDayOfMonth(date) && 'border-l-4 border-l-border'
                )}
              >
                <div className={cn('font-medium', isSameDay(date, today) && 'text-primary')}>
                  {format(date, 'EEE', { locale: enUS })}
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
                  className="flex border-b-2 bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors"
                  onClick={() => toggleExpand(project.id)}
                >
                  <div className="w-64 p-3 border-r bg-background/50 flex items-center gap-2">
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
                      <div className="font-semibold text-sm">{project.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {project.customer}
                      </div>
                    </div>
                  </div>
                  {dates.map((date) => (
                    <div
                      key={date.toISOString()}
                      className={cn(
                        columnWidth, 'border-r relative flex items-center justify-center',
                        isWeekend(date) && 'bg-weekend',
                        isHoliday(date) && 'bg-holiday',
                        isSameDay(date, today) && 'bg-primary/10 border-x-2 border-x-primary',
                        isFirstDayOfMonth(date) && 'border-l-4 border-l-border'
                      )}
                    >
                      {hasOverlap(project.id, date, 'project') && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500 dark:bg-orange-400 rounded-t-sm shadow-sm" />
                      )}
                      {!expandedItemsSet.has(project.id) && projectHasAssignmentOnDate(project.id, date) && (
                        <div className={cn(
                          'w-2 h-2 rounded-full',
                          project.status === 'confirmed'
                            ? 'bg-emerald-500 dark:bg-emerald-400'
                            : 'bg-orange-500 dark:bg-orange-400'
                        )} />
                      )}
                    </div>
                  ))}
                </div>

                {expandedItemsSet.has(project.id) &&
                  assignments.map((assignment: any) => {
                    const member = members.find(
                      (m) => m.id === assignment.teamMemberId
                    )
                    if (!member) return null

                    return (
                      <div key={assignment.id} className="flex border-b bg-background/30 hover:bg-muted/20 transition-colors">
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
                          <span className="text-sm text-muted-foreground">
                            {member.firstName} {member.lastName}
                          </span>
                        </div>
                        {dates.map((date) => (
                          <div
                            key={date.toISOString()}
                            className={cn(
                              columnWidth, 'border-r p-1 group relative flex items-center justify-center',
                              isWeekend(date) && 'bg-weekend',
                              isHoliday(date) && 'bg-holiday',
                              isSameDay(date, today) && 'bg-primary/10 border-x-2 border-x-primary',
                              isAdmin && 'cursor-pointer',
                              isFirstDayOfMonth(date) && 'border-l-4 border-l-border'
                            )}
                            onMouseDown={() =>
                              handleMouseDown(assignment.id, date)
                            }
                            onMouseEnter={() => handleMouseEnter(date)}
                          >
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <span className="text-xs text-muted-foreground/40 font-medium">
                                {format(date, 'EEE', { locale: enUS })}
                              </span>
                            </div>
                            {(isDayAssigned(assignment.id, date) ||
                              isDayInDragRange(assignment.id, date)) && (
                              <div
                                className={cn(
                                  'h-6 rounded shadow-sm border-2',
                                  project.status === 'confirmed'
                                    ? 'bg-confirmed border-emerald-400 dark:border-emerald-500'
                                    : 'bg-tentative border-amber-400 dark:border-amber-500',
                                  isDayInDragRange(assignment.id, date) &&
                                    'opacity-50'
                                )}
                                onMouseDown={(e) => {
                                  // Stop propagation to prevent drag from starting
                                  e.stopPropagation()
                                }}
                                onContextMenu={(e) =>
                                  handleDeleteDayAssignment(assignment.id, date, e)
                                }
                                onClick={(e) => {
                                  if (e.ctrlKey || e.metaKey) {
                                    handleDeleteDayAssignment(assignment.id, date, e)
                                  }
                                }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  })}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // By Member view
  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        {/* Header */}
        <div className="sticky top-0 bg-background z-10 shadow-sm">
          {/* Month labels row */}
          <div className="flex border-b">
            <div className="w-64 border-r bg-muted/30"></div>
            {monthGroups.map((group, idx) => {
              // Calculate width based on column count and zoom level
              const pixelWidths = { 1: 48, 2: 64, 3: 80, 4: 96 }
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
          <div className="w-64 p-3 font-semibold border-r bg-muted/30">Team Member</div>
          {dates.map((date) => (
            <div
              key={date.toISOString()}
              className={cn(
                columnWidth, 'p-2 text-center text-sm border-r',
                isWeekend(date) && 'bg-weekend',
                isHoliday(date) && 'bg-holiday',
                isSameDay(date, today) && 'bg-primary/10 border-x-2 border-x-primary font-bold',
                isFirstDayOfMonth(date) && 'border-l-4 border-l-border'
              )}
            >
              <div className={cn('font-medium', isSameDay(date, today) && 'text-primary')}>
                {format(date, 'EEE', { locale: enUS })}
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
                className="flex border-b-2 bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors"
                onClick={() => toggleExpand(member.id)}
              >
                <div className="w-64 p-3 border-r bg-background/50 flex items-center gap-2">
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
                {dates.map((date) => (
                  <div
                    key={date.toISOString()}
                    className={cn(
                      columnWidth, 'border-r relative flex items-center justify-center',
                      isWeekend(date) && 'bg-weekend',
                      isHoliday(date) && 'bg-holiday',
                      isSameDay(date, today) && 'bg-primary/10 border-x-2 border-x-primary',
                      isFirstDayOfMonth(date) && 'border-l-4 border-l-border'
                    )}
                  >
                    {hasOverlap(member.id, date, 'member') && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500 dark:bg-orange-400 rounded-t-sm shadow-sm" />
                    )}
                    {!expandedItemsSet.has(member.id) && memberHasAssignmentOnDate(member.id, date) && (
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        memberHasConfirmedAssignmentOnDate(member.id, date)
                          ? 'bg-emerald-500 dark:bg-emerald-400'
                          : 'bg-orange-500 dark:bg-orange-400'
                      )} />
                    )}
                  </div>
                ))}
              </div>

              {expandedItemsSet.has(member.id) &&
                assignments.map((assignment: any) => {
                  const project = projects.find(
                    (p) => p.id === assignment.projectId
                  )
                  if (!project) return null

                  // Hide tentative projects if hideTentative is enabled
                  if (hideTentative && project.status === 'tentative') return null

                  return (
                    <div key={assignment.id} className="flex border-b bg-background/30 hover:bg-muted/20 transition-colors">
                      <div
                        className={cn(
                          'w-64 p-2 pl-10 border-r bg-background/50',
                          project.status === 'tentative' && 'opacity-50'
                        )}
                      >
                        <div className="text-xs font-medium text-muted-foreground">{project.name}</div>
                        <div className="text-xs text-muted-foreground/70">
                          {project.customer}
                        </div>
                      </div>
                      {dates.map((date) => (
                        <div
                          key={date.toISOString()}
                          className={cn(
                            columnWidth, 'border-r p-1 group relative flex items-center justify-center',
                            isWeekend(date) && 'bg-weekend',
                            isHoliday(date) && 'bg-holiday',
                            isSameDay(date, today) && 'bg-primary/10 border-x-2 border-x-primary',
                            isAdmin && 'cursor-pointer',
                            isFirstDayOfMonth(date) && 'border-l-4 border-l-border'
                          )}
                          onMouseDown={() =>
                            handleMouseDown(assignment.id, date)
                          }
                          onMouseEnter={() => handleMouseEnter(date)}
                        >
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <span className="text-xs text-muted-foreground/40 font-medium">
                              {format(date, 'EEE', { locale: enUS })}
                            </span>
                          </div>
                          {(isDayAssigned(assignment.id, date) ||
                            isDayInDragRange(assignment.id, date)) && (
                            <div
                              className={cn(
                                'h-6 rounded shadow-sm border-2',
                                project.status === 'confirmed'
                                  ? 'bg-confirmed border-emerald-400 dark:border-emerald-500'
                                  : 'bg-tentative border-amber-400 dark:border-amber-500',
                                isDayInDragRange(assignment.id, date) &&
                                  'opacity-50'
                              )}
                              onMouseDown={(e) => {
                                // Stop propagation to prevent drag from starting
                                e.stopPropagation()
                              }}
                              onContextMenu={(e) =>
                                handleDeleteDayAssignment(assignment.id, date, e)
                              }
                              onClick={(e) => {
                                if (e.ctrlKey || e.metaKey) {
                                  handleDeleteDayAssignment(assignment.id, date, e)
                                }
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
