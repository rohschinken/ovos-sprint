import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/client'
import { TimelineViewMode, Project, TeamMember, DayAssignment } from '@/types'
import { isHoliday, isWeekend, getHolidayName } from '@/lib/holidays'
import { cn, getInitials } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { format, addDays, startOfDay, isSameDay } from 'date-fns'
import { de } from 'date-fns/locale'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface TimelineProps {
  viewMode: TimelineViewMode
  prevDays: number
  nextDays: number
  isAdmin: boolean
  selectedTeamIds: number[]
}

export default function Timeline({
  viewMode,
  prevDays,
  nextDays,
  isAdmin,
  selectedTeamIds,
}: TimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
  const [dragState, setDragState] = useState<{
    assignmentId: number | null
    startDate: Date | null
    endDate: Date | null
  }>({ assignmentId: null, startDate: null, endDate: null })

  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Generate dates
  const today = startOfDay(new Date())
  const startDate = addDays(today, -prevDays)
  const dates: Date[] = []
  for (let i = 0; i <= prevDays + nextDays; i++) {
    dates.push(addDays(startDate, i))
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', 'days'] })
      toast({ title: 'Assignment deleted' })
    },
  })

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
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

      toast({ title: 'Assignment created' })
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

    if (confirm('Delete this day assignment?')) {
      deleteDayAssignmentMutation.mutate(dayAssignmentId)
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
          <div className="flex border-b sticky top-0 bg-background z-10">
            <div className="w-64 p-3 font-semibold border-r">Project</div>
            {dates.map((date) => (
              <div
                key={date.toISOString()}
                className={cn(
                  'w-24 p-2 text-center text-sm border-r',
                  isWeekend(date) && 'bg-weekend',
                  isHoliday(date) && 'bg-holiday',
                  isSameDay(date, today) && 'border-l-2 border-l-primary'
                )}
              >
                <div className="font-medium">
                  {format(date, 'EEE', { locale: de })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(date, 'dd.MM')}
                </div>
                {isHoliday(date) && (
                  <div className="text-xs text-yellow-700">
                    {getHolidayName(date)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Projects */}
          {projects.map((project) => {
            const assignments = projectAssignments.filter(
              (pa: any) => pa.projectId === project.id
            )

            return (
              <div key={project.id}>
                <div
                  className="flex border-b hover:bg-muted/50 cursor-pointer"
                  onClick={() => toggleExpand(project.id)}
                >
                  <div className="w-64 p-3 border-r flex items-center gap-2">
                    {expandedItems.has(project.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <div
                      className={cn(
                        project.status === 'tentative' && 'opacity-50'
                      )}
                    >
                      <div className="font-medium">{project.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {project.customer}
                      </div>
                    </div>
                  </div>
                  {dates.map((date) => (
                    <div
                      key={date.toISOString()}
                      className={cn(
                        'w-24 border-r',
                        isWeekend(date) && 'bg-weekend',
                        isHoliday(date) && 'bg-holiday',
                        hasOverlap(project.id, date, 'project') && 'bg-overlap'
                      )}
                    />
                  ))}
                </div>

                {expandedItems.has(project.id) &&
                  assignments.map((assignment: any) => {
                    const member = members.find(
                      (m) => m.id === assignment.teamMemberId
                    )
                    if (!member) return null

                    return (
                      <div key={assignment.id} className="flex border-b">
                        <div className="w-64 p-3 pl-10 border-r flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={member.avatarUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(member.firstName, member.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {member.firstName} {member.lastName}
                          </span>
                        </div>
                        {dates.map((date) => (
                          <div
                            key={date.toISOString()}
                            className={cn(
                              'w-24 border-r p-1',
                              isWeekend(date) && 'bg-weekend',
                              isHoliday(date) && 'bg-holiday',
                              isAdmin && 'cursor-pointer'
                            )}
                            onMouseDown={() =>
                              handleMouseDown(assignment.id, date)
                            }
                            onMouseEnter={() => handleMouseEnter(date)}
                          >
                            {(isDayAssigned(assignment.id, date) ||
                              isDayInDragRange(assignment.id, date)) && (
                              <div
                                className={cn(
                                  'h-6 rounded',
                                  project.status === 'confirmed'
                                    ? 'bg-confirmed'
                                    : 'bg-tentative',
                                  isDayInDragRange(assignment.id, date) &&
                                    'opacity-50'
                                )}
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
        <div className="flex border-b sticky top-0 bg-background z-10">
          <div className="w-64 p-3 font-semibold border-r">Team Member</div>
          {dates.map((date) => (
            <div
              key={date.toISOString()}
              className={cn(
                'w-24 p-2 text-center text-sm border-r',
                isWeekend(date) && 'bg-weekend',
                isHoliday(date) && 'bg-holiday',
                isSameDay(date, today) && 'border-l-2 border-l-primary'
              )}
            >
              <div className="font-medium">
                {format(date, 'EEE', { locale: de })}
              </div>
              <div className="text-xs text-muted-foreground">
                {format(date, 'dd.MM')}
              </div>
              {isHoliday(date) && (
                <div className="text-xs text-yellow-700">
                  {getHolidayName(date)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Members */}
        {filteredMembers.map((member) => {
          const assignments = projectAssignments.filter(
            (pa: any) => pa.teamMemberId === member.id
          )

          return (
            <div key={member.id}>
              <div
                className="flex border-b hover:bg-muted/50 cursor-pointer"
                onClick={() => toggleExpand(member.id)}
              >
                <div className="w-64 p-3 border-r flex items-center gap-2">
                  {expandedItems.has(member.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatarUrl || undefined} />
                    <AvatarFallback>
                      {getInitials(member.firstName, member.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">
                    {member.firstName} {member.lastName}
                  </span>
                </div>
                {dates.map((date) => (
                  <div
                    key={date.toISOString()}
                    className={cn(
                      'w-24 border-r',
                      isWeekend(date) && 'bg-weekend',
                      isHoliday(date) && 'bg-holiday',
                      hasOverlap(member.id, date, 'member') && 'bg-overlap'
                    )}
                  />
                ))}
              </div>

              {expandedItems.has(member.id) &&
                assignments.map((assignment: any) => {
                  const project = projects.find(
                    (p) => p.id === assignment.projectId
                  )
                  if (!project) return null

                  return (
                    <div key={assignment.id} className="flex border-b">
                      <div
                        className={cn(
                          'w-64 p-3 pl-10 border-r',
                          project.status === 'tentative' && 'opacity-50'
                        )}
                      >
                        <div className="text-sm font-medium">{project.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {project.customer}
                        </div>
                      </div>
                      {dates.map((date) => (
                        <div
                          key={date.toISOString()}
                          className={cn(
                            'w-24 border-r p-1',
                            isWeekend(date) && 'bg-weekend',
                            isHoliday(date) && 'bg-holiday',
                            isAdmin && 'cursor-pointer'
                          )}
                          onMouseDown={() =>
                            handleMouseDown(assignment.id, date)
                          }
                          onMouseEnter={() => handleMouseEnter(date)}
                        >
                          {(isDayAssigned(assignment.id, date) ||
                            isDayInDragRange(assignment.id, date)) && (
                            <div
                              className={cn(
                                'h-6 rounded',
                                project.status === 'confirmed'
                                  ? 'bg-confirmed'
                                  : 'bg-tentative',
                                isDayInDragRange(assignment.id, date) &&
                                  'opacity-50'
                              )}
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
