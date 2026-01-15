import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/client'
import { TimelineViewMode, Project, TeamMember, Milestone, DayOff, AssignmentGroup, AssignmentPriority } from '@/types'
import { isHoliday, isWeekend, getHolidayName } from '@/lib/holidays'
import { cn, getInitials, getAvatarColor } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { format, addDays, startOfDay, isSameDay, isFirstDayOfMonth, getDay, getISOWeek } from 'date-fns'
import { enGB } from 'date-fns/locale'
import { ChevronDown, ChevronRight, Clock } from 'lucide-react'
import { WarningDialog } from './ui/warning-dialog'
import { AssignmentEditPopover } from './AssignmentEditPopover'

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
  const [dragState, setDragState] = useState<{
    assignmentId: number | null
    startDate: Date | null
    endDate: Date | null
  }>({ assignmentId: null, startDate: null, endDate: null })
  const [timelineWarning, setTimelineWarning] = useState<{
    type: 'holiday' | 'non-working-day'
    message: string | React.ReactNode
    onConfirm: () => void
  } | null>(null)
  const [editPopover, setEditPopover] = useState<{
    open: boolean
    position: { x: number; y: number }
    projectAssignmentId: number
    dateRange: { start: string; end: string }
    group: AssignmentGroup | null
  } | null>(null)

  // Track if initial expansion has been done to prevent re-expanding when user collapses all
  const hasInitializedExpansion = useRef(false)

  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Convert expandedItems array to Set for easier manipulation
  const expandedItemsSet = new Set(expandedItemsProp)

  // Column width based on zoom level (1=extra narrow, 2=compact, 3=narrow, 4=normal)
  const columnWidths = {
    1: 'w-10', // 40px - Extra Narrow
    2: 'w-12', // 48px - Compact
    3: 'w-16', // 64px - Narrow
    4: 'w-20', // 80px - Normal
  }
  const columnWidth = columnWidths[zoomLevel as keyof typeof columnWidths] || 'w-16'

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

  const { data: milestones = [] } = useQuery({
    queryKey: [
      'milestones',
      format(startDate, 'yyyy-MM-dd'),
      format(dates[dates.length - 1], 'yyyy-MM-dd'),
    ],
    queryFn: async () => {
      const response = await api.get('/milestones', {
        params: {
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(dates[dates.length - 1], 'yyyy-MM-dd'),
        },
      })
      return response.data as Milestone[]
    },
  })

  const { data: dayOffs = [] } = useQuery({
    queryKey: [
      'day-offs',
      format(startDate, 'yyyy-MM-dd'),
      format(dates[dates.length - 1], 'yyyy-MM-dd'),
    ],
    queryFn: async () => {
      const response = await api.get('/day-offs', {
        params: {
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(dates[dates.length - 1], 'yyyy-MM-dd'),
        },
      })
      return response.data as DayOff[]
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

  const { data: assignmentGroups = [] } = useQuery({
    queryKey: [
      'assignment-groups',
      format(startDate, 'yyyy-MM-dd'),
      format(dates[dates.length - 1], 'yyyy-MM-dd'),
    ],
    queryFn: async () => {
      const response = await api.get('/assignments/groups', {
        params: {
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(dates[dates.length - 1], 'yyyy-MM-dd'),
        },
      })
      return response.data as AssignmentGroup[]
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

  // Filter out tentative projects if showTentative is false
  const filteredProjects = showTentative
    ? filteredProjectsWithMembers
    : filteredProjectsWithMembers.filter((project) => project.status === 'confirmed')

  // Filter out members without projects
  const filteredMembersWithProjects = filteredMembers.filter((member) => {
    const assignments = projectAssignments.filter(
      (pa: any) => pa.teamMemberId === member.id
    )
    // If showTentative is false, only count confirmed project assignments
    if (!showTentative) {
      const confirmedAssignments = assignments.filter((pa: any) => {
        const project = projects.find((p) => p.id === pa.projectId)
        return project && project.status === 'confirmed'
      })
      return confirmedAssignments.length > 0
    }
    return assignments.length > 0
  })

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

  const createDayAssignmentMutation = useMutation({
    mutationFn: async (data: {
      projectAssignmentId: number
      date: string
    }) => {
      const response = await api.post('/assignments/days', data)
      return response.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['assignments', 'days'] })
      // Day mutations can trigger group merges, so refetch groups too
      await queryClient.refetchQueries({
        queryKey: ['assignment-groups'],
        type: 'all'
      })
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
      // Day deletions can trigger group splits/deletions, so refetch groups too
      await queryClient.refetchQueries({
        queryKey: ['assignment-groups'],
        type: 'all'
      })
      toast({ title: 'Assignment deleted' })
    },
  })

  const createMilestoneMutation = useMutation({
    mutationFn: async (data: { projectId: number; date: string }) => {
      const response = await api.post('/milestones', data)
      return response.data
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ['milestones'],
        type: 'all'
      })
      toast({ title: 'Milestone created' })
    },
  })

  const deleteMilestoneMutation = useMutation({
    mutationFn: async (milestoneId: number) => {
      await api.delete(`/milestones/${milestoneId}`)
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ['milestones'],
        type: 'all'
      })
      toast({ title: 'Milestone deleted' })
    },
  })

  const createDayOffMutation = useMutation({
    mutationFn: async ({ teamMemberId, date }: { teamMemberId: number; date: string }) => {
      await api.post('/day-offs', { teamMemberId, date })
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ['day-offs'],
        type: 'all'
      })
      await queryClient.refetchQueries({
        queryKey: ['assignments', 'days'],
        type: 'all'
      })
      toast({ title: 'Day off added' })
    },
  })

  const deleteDayOffMutation = useMutation({
    mutationFn: async (dayOffId: number) => {
      await api.delete(`/day-offs/${dayOffId}`)
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ['day-offs'],
        type: 'all'
      })
      toast({ title: 'Day off removed' })
    },
  })

  const saveAssignmentGroupMutation = useMutation({
    mutationFn: async (data: {
      groupId?: number
      projectAssignmentId: number
      startDate: string
      endDate: string
      priority: AssignmentPriority
      comment: string | null
    }) => {
      if (data.groupId) {
        // Update existing group
        const response = await api.put(`/assignments/groups/${data.groupId}`, {
          priority: data.priority,
          comment: data.comment,
        })
        return response.data
      } else {
        // Try to create new group
        try {
          const response = await api.post('/assignments/groups', {
            projectAssignmentId: data.projectAssignmentId,
            startDate: data.startDate,
            endDate: data.endDate,
            priority: data.priority,
            comment: data.comment,
          })
          return response.data
        } catch (error: unknown) {
          // If overlapping group exists, update it instead
          const axiosError = error as { response?: { data?: { existingGroupId?: number } } }
          if (axiosError.response?.data?.existingGroupId) {
            const response = await api.put(`/assignments/groups/${axiosError.response.data.existingGroupId}`, {
              priority: data.priority,
              comment: data.comment,
            })
            return response.data
          }
          throw error
        }
      }
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ['assignment-groups'],
        type: 'all'
      })
      toast({ title: 'Assignment updated' })
    },
    onError: (error) => {
      console.error('Failed to save assignment group:', error)
      toast({ title: 'Failed to update assignment', variant: 'destructive' })
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

  // Helper function to check if a date is a day-off for a specific member
  const isDayOff = (memberId: number, date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return dayOffs.some(
      dayOff => dayOff.teamMemberId === memberId && dayOff.date === dateStr
    )
  }

  // Helper function to get the day-off record for a specific member and date
  const getDayOff = (memberId: number, date: Date): DayOff | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return dayOffs.find(
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

  const handleMouseDown = (assignmentId: number, date: Date, _e: React.MouseEvent) => {
    if (!canEditAssignment(assignmentId)) return

    // Don't start drag if it's a right-click or CTRL/CMD+click (these are for deletion)
    if (_e.button === 2 || _e.ctrlKey || _e.metaKey) {
      return
    }

    // Always set drag state - warnings will be checked in handleMouseUp
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

      // Get the assignment to check member and warnings
      const assignment = projectAssignments.find((pa: any) => pa.id === dragState.assignmentId)
      const warnWeekend = settings.warnWeekendAssignments !== 'false'

      // Check all dates in the range for holidays and non-working days
      if (warnWeekend && assignment) {
        const holidays: string[] = []
        const nonWorkingDays: string[] = []

        for (let i = 0; i <= daysDiff; i++) {
          const date = addDays(start, i)

          if (isHoliday(date)) {
            const holidayName = getHolidayName(date)
            holidays.push(holidayName || format(date, 'MMM d'))
          } else if (isNonWorkingDay(assignment.teamMemberId, date)) {
            nonWorkingDays.push(format(date, 'MMM d'))
          }
        }

        // Show warning if there are holidays or non-working days
        if (holidays.length > 0 || nonWorkingDays.length > 0) {
          const member = members.find((m) => m.id === assignment.teamMemberId)
          const memberName = member ? `${member.firstName} ${member.lastName}` : 'this member'

          // Build message with strong tags for dates
          const message = (
            <>
              {holidays.length > 0 && (
                <>
                  The following dates are holidays: <strong>{holidays.join(', ')}</strong>.{' '}
                </>
              )}
              {nonWorkingDays.length > 0 && (
                <>
                  The following dates are non-working days for {memberName}: <strong>{nonWorkingDays.join(', ')}</strong>.{' '}
                </>
              )}
              Are you sure you want to assign work on these days?
            </>
          )

          setTimelineWarning({
            type: holidays.length > 0 ? 'holiday' : 'non-working-day',
            message,
            onConfirm: () => {
              // User confirmed, create all assignments
              for (let i = 0; i <= daysDiff; i++) {
                const date = addDays(start, i)
                createDayAssignmentMutation.mutate({
                  projectAssignmentId: dragState.assignmentId,
                  date: format(date, 'yyyy-MM-dd'),
                })
              }
              setTimelineWarning(null)
            },
          })

          // Clear drag state but don't create assignments yet (waiting for confirmation)
          setDragState({ assignmentId: null, startDate: null, endDate: null })
          return
        }
      }

      // No warnings needed, create assignments directly
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

  // Helper functions to determine position in consecutive assignment range
  const isPrevDayAssigned = (assignmentId: number, date: Date) => {
    const prevDate = addDays(date, -1)
    return isDayAssigned(assignmentId, prevDate)
  }

  const isNextDayAssigned = (assignmentId: number, date: Date) => {
    const nextDate = addDays(date, 1)
    return isDayAssigned(assignmentId, nextDate)
  }

  const getAssignmentRoundedClass = (assignmentId: number, date: Date) => {
    const hasPrev = isPrevDayAssigned(assignmentId, date)
    const hasNext = isNextDayAssigned(assignmentId, date)

    if (!hasPrev && !hasNext) return 'rounded' // Single day
    if (!hasPrev && hasNext) return 'rounded-l' // First day
    if (hasPrev && hasNext) return 'rounded-none' // Middle day
    if (hasPrev && !hasNext) return 'rounded-r' // Last day
    return 'rounded'
  }

  const getAssignmentBorderClass = (assignmentId: number, date: Date) => {
    const hasPrev = isPrevDayAssigned(assignmentId, date)
    const hasNext = isNextDayAssigned(assignmentId, date)

    // For connected assignments, remove borders between consecutive days
    const classes = ['border-t-2', 'border-b-2']

    if (!hasPrev) classes.push('border-l-2') // Show left border if first day
    if (!hasNext) classes.push('border-r-2') // Show right border if last day

    return classes.join(' ')
  }

  const getAssignmentWidthClass = (assignmentId: number, date: Date) => {
    const hasNext = isNextDayAssigned(assignmentId, date)

    // Extend width slightly to overlap with next cell border for seamless connection
    if (hasNext) return 'w-[calc(100%+1px)]' // Extend 1px to overlap
    return 'w-full'
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

  // Get the contiguous date range containing a specific date for an assignment
  const getContiguousRangeForDate = (assignmentId: number, date: Date): { start: string; end: string } => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const dates: string[] = [dateStr]

    // Expand backwards
    let checkDate = addDays(date, -1)
    while (isDayAssigned(assignmentId, checkDate)) {
      dates.unshift(format(checkDate, 'yyyy-MM-dd'))
      checkDate = addDays(checkDate, -1)
    }

    // Expand forwards
    checkDate = addDays(date, 1)
    while (isDayAssigned(assignmentId, checkDate)) {
      dates.push(format(checkDate, 'yyyy-MM-dd'))
      checkDate = addDays(checkDate, 1)
    }

    return {
      start: dates[0],
      end: dates[dates.length - 1]
    }
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

  // Check if this is the first day of a contiguous range (for showing comment indicator)
  const isFirstDayOfRange = (assignmentId: number, date: Date): boolean => {
    return !isPrevDayAssigned(assignmentId, date)
  }

  // Check if this is the last day of a contiguous range (for showing priority indicators)
  const isLastDayOfRange = (assignmentId: number, date: Date): boolean => {
    return !isNextDayAssigned(assignmentId, date)
  }

  // Get the number of visible days in the contiguous range containing a date
  // This counts only days that are in the filtered `dates` array (respects showWeekends setting)
  const getVisibleRangeLengthInDays = (assignmentId: number, startDate: Date): number => {
    const range = getContiguousRangeForDate(assignmentId, startDate)
    const rangeStart = new Date(range.start)
    const rangeEnd = new Date(range.end)

    // Count visible days in the range
    let count = 1
    for (const d of dates) {
      if (d >= rangeStart && d <= rangeEnd) {
        count++
      }
    }
    return count
  }

  // Get the pixel width for the comment text overlay based on visible range length and zoom
  const getCommentOverlayWidth = (assignmentId: number, date: Date): number => {
    const visibleRangeLength = getVisibleRangeLengthInDays(assignmentId, date)
    const pixelWidths = { 1: 40, 2: 48, 3: 64, 4: 80 }
    const cellWidth = pixelWidths[zoomLevel as keyof typeof pixelWidths] || 64
    // Reserve space for priority indicator (24px) at end only - emoji is inside the width
    return visibleRangeLength * cellWidth - 24
  }

  // Get the pixel offset from the start of the dates grid for a specific date
  const getDatePixelOffset = (targetDate: Date): number => {
    const pixelWidths = { 1: 40, 2: 48, 3: 64, 4: 80 }
    const cellWidth = pixelWidths[zoomLevel as keyof typeof pixelWidths] || 64
    const dayIndex = dates.findIndex(d => isSameDay(d, targetDate))
    if (dayIndex === -1) return 0
    return dayIndex * cellWidth
  }

  // Get the date from a click's clientX position (relative to the timeline row)
  const getDateFromClickX = (clientX: number, rowElement: HTMLElement): Date | null => {
    const pixelWidths = { 1: 40, 2: 48, 3: 64, 4: 80 }
    const cellWidth = pixelWidths[zoomLevel as keyof typeof pixelWidths] || 64
    const sidebarWidth = 256 // w-64 = 256px
    const rowRect = rowElement.getBoundingClientRect()
    const xInRow = clientX - rowRect.left - sidebarWidth
    if (xInRow < 0) return null
    const dayIndex = Math.floor(xInRow / cellWidth)
    if (dayIndex >= 0 && dayIndex < dates.length) {
      return dates[dayIndex]
    }
    return null
  }

  // Handle click on assignment bar to open edit popover
  const handleAssignmentClick = (assignmentId: number, date: Date, event: React.MouseEvent) => {
    if (!canEditAssignment(assignmentId)) return
    if (event.ctrlKey || event.metaKey) return // Don't interfere with delete action

    event.stopPropagation()

    const range = getContiguousRangeForDate(assignmentId, date)
    const group = getGroupForDate(assignmentId, date)

    setEditPopover({
      open: true,
      position: { x: event.clientX, y: event.clientY },
      projectAssignmentId: assignmentId,
      dateRange: range,
      group
    })
  }

  // Milestone helper functions
  const hasMilestone = (projectId: number, date: Date) => {
    return milestones.some(
      (m: Milestone) =>
        m.projectId === projectId &&
        isSameDay(new Date(m.date), date)
    )
  }

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

  // Helper functions for collapsed row assignment bar connections
  const projectHasAssignmentOnPrevDay = (projectId: number, date: Date) => {
    const prevDate = addDays(date, -1)
    return projectHasAssignmentOnDate(projectId, prevDate)
  }

  const projectHasAssignmentOnNextDay = (projectId: number, date: Date) => {
    const nextDate = addDays(date, 1)
    return projectHasAssignmentOnDate(projectId, nextDate)
  }

  const memberHasAssignmentOnPrevDay = (memberId: number, date: Date) => {
    const prevDate = addDays(date, -1)
    return memberHasAssignmentOnDate(memberId, prevDate)
  }

  const memberHasAssignmentOnNextDay = (memberId: number, date: Date) => {
    const nextDate = addDays(date, 1)
    return memberHasAssignmentOnDate(memberId, nextDate)
  }

  const getCollapsedBarRoundedClass = (hasPrev: boolean, hasNext: boolean) => {
    if (!hasPrev && !hasNext) return 'rounded' // Single day
    if (!hasPrev && hasNext) return 'rounded-l' // First day
    if (hasPrev && hasNext) return 'rounded-none' // Middle day
    if (hasPrev && !hasNext) return 'rounded-r' // Last day
    return 'rounded'
  }

  const getCollapsedBarBorderClass = (hasPrev: boolean, hasNext: boolean) => {
    const classes = ['border-t-2', 'border-b-2']
    if (!hasPrev) classes.push('border-l-2')
    if (!hasNext) classes.push('border-r-2')
    return classes.join(' ')
  }

  const getCollapsedBarWidthClass = (hasNext: boolean) => {
    if (hasNext) return 'w-[calc(100%+1px)]'
    return 'w-full'
  }

  // Check if a member has ANY assignments on a date (for collapsed view)
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
    if (!showOverlaps) return false

    const count = mode === 'member'
      ? getMemberAssignmentsOnDate(id, date)
      : getProjectMembersOnDate(id, date)

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
                          {hasMilestone(project.id, date) && (
                            <div className="absolute top-0 bottom-0 right-0 left-0 text-sm text-center font-medium pointer-events-none">
                            🚩
                            </div>
                          )}
                          {!expandedItemsSet.has(project.id) && projectHasAssignmentOnDate(project.id, date) && (
                            <div
                              className={cn(
                                'h-3 shadow-sm',
                                getCollapsedBarWidthClass(projectHasAssignmentOnNextDay(project.id, date)),
                                getCollapsedBarRoundedClass(
                                  projectHasAssignmentOnPrevDay(project.id, date),
                                  projectHasAssignmentOnNextDay(project.id, date)
                                ),
                                getCollapsedBarBorderClass(
                                  projectHasAssignmentOnPrevDay(project.id, date),
                                  projectHasAssignmentOnNextDay(project.id, date)
                                ),
                                // Always green for collapsed projects (with opacity for tentative)
                                'bg-confirmed border-emerald-400',
                                project.status === 'tentative' && 'opacity-60'
                              )}
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
                              if ((e.ctrlKey || e.metaKey) && isDayAssigned(assignment.id, date)) {
                                handleDeleteDayAssignment(assignment.id, date, e)
                              }
                            }}
                            onContextMenu={(_e) => {
                              _e.preventDefault() // Prevent browser context menu
                              if (isDayAssigned(assignment.id, date)) {
                                handleDeleteDayAssignment(assignment.id, date, _e)
                              }
                            }}
                          >
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <span className="text-xs text-muted-foreground/40 dark:text-muted-foreground/60 font-medium">
                                {format(date, 'EEE', { locale: enGB })}
                              </span>
                            </div>
                            {(isDayAssigned(assignment.id, date) ||
                              isDayInDragRange(assignment.id, date)) && (
                              <div
                                className={cn(
                                  'h-5 shadow-sm relative z-20',
                                  getAssignmentWidthClass(assignment.id, date),
                                  getAssignmentRoundedClass(assignment.id, date),
                                  getAssignmentBorderClass(assignment.id, date),
                                  // Color orange if overlap, otherwise green
                                  hasOverlap(member.id, date, 'member')
                                    ? 'bg-orange-500/40 border-orange-400'
                                    : 'bg-confirmed border-emerald-400',
                                  project.status === 'tentative' && !hasOverlap(member.id, date, 'member') && 'opacity-60',
                                  isDayInDragRange(assignment.id, date) &&
                                    'opacity-50',
                                  isAdmin && 'cursor-pointer'
                                )}
                                onMouseDown={(e) => {
                                  // Stop propagation to prevent parent cell from starting drag
                                  e.stopPropagation()
                                }}
                                onClick={(e) => {
                                  if (isDayAssigned(assignment.id, date)) {
                                    handleAssignmentClick(assignment.id, date, e)
                                  }
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault()
                                  if (isDayAssigned(assignment.id, date)) {
                                    handleDeleteDayAssignment(assignment.id, date, e)
                                  }
                                }}
                                style={{ pointerEvents: 'auto' }}
                              >
                                {/* Priority indicators - on last day of range */}
                                {isDayAssigned(assignment.id, date) && isLastDayOfRange(assignment.id, date) && (
                                  <>
                                    {getGroupPriority(assignment.id, date) === 'high' && (
                                      <span className="absolute top-1/2 -translate-y-1/2 right-0 text-[9px] leading-none z-30 pointer-events-none">
                                        {'🔥'}
                                      </span>
                                    )}
                                    {getGroupPriority(assignment.id, date) === 'low' && (
                                      <span className="absolute top-1/2 -translate-y-1/2 right-0 text-[9px] leading-none z-30 pointer-events-none">
                                        {'🤷‍♂️'}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                        {/* Comment overlay rendered at row level to appear above all bar segments */}
                        {(() => {
                          // Find all contiguous ranges with comments for this assignment
                          const commentRanges: { date: Date; comment: string }[] = []
                          dates.forEach(date => {
                            if (isDayAssigned(assignment.id, date) && isFirstDayOfRange(assignment.id, date)) {
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
                                    left: 256 + getDatePixelOffset(date) + 4, // 256px = w-64 sidebar, +4 for padding
                                    width: getCommentOverlayWidth(assignment.id, date),
                                  }}
                                  onClick={(e) => {
                                    // Find the actual date clicked based on X position
                                    const row = e.currentTarget.closest('.relative') as HTMLElement
                                    if (row) {
                                      const clickedDate = getDateFromClickX(e.clientX, row)
                                      if (clickedDate && isDayAssigned(assignment.id, clickedDate)) {
                                        handleAssignmentClick(assignment.id, clickedDate, e)
                                      }
                                    }
                                  }}
                                  onContextMenu={(e) => {
                                    e.preventDefault()
                                    // Find the actual date clicked based on X position
                                    const row = e.currentTarget.closest('.relative') as HTMLElement
                                    if (row) {
                                      const clickedDate = getDateFromClickX(e.clientX, row)
                                      if (clickedDate && isDayAssigned(assignment.id, clickedDate)) {
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
                        {isDayOff(member.id, date) && (
                          <div className="absolute bottom-0 left-0 right-0 text-[10px] text-dayOffText text-center font-medium pointer-events-none">
                            vac. 🏝️
                          </div>
                        )}
                        {!expandedItemsSet.has(member.id) && memberHasAssignmentOnDate(member.id, date) && (
                          <div
                            className={cn(
                              'h-3 shadow-sm',
                              getCollapsedBarWidthClass(memberHasAssignmentOnNextDay(member.id, date)),
                              getCollapsedBarRoundedClass(
                                memberHasAssignmentOnPrevDay(member.id, date),
                                memberHasAssignmentOnNextDay(member.id, date)
                              ),
                              getCollapsedBarBorderClass(
                                memberHasAssignmentOnPrevDay(member.id, date),
                                memberHasAssignmentOnNextDay(member.id, date)
                              ),
                              // Color orange if overlap, otherwise green (with opacity for tentative)
                              hasOverlap(member.id, date, 'member')
                                ? 'bg-orange-500/40 border-orange-400'
                                : 'bg-confirmed border-emerald-400',
                              // Reduce opacity for tentative (when not all assignments are confirmed)
                              !hasOverlap(member.id, date, 'member') && !memberHasConfirmedAssignmentOnDate(member.id, date) && 'opacity-60'
                            )}
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
                            if ((e.ctrlKey || e.metaKey) && isDayAssigned(assignment.id, date)) {
                              handleDeleteDayAssignment(assignment.id, date, e)
                            }
                          }}
                                                      onContextMenu={(_e) => {
                                                        _e.preventDefault() // Prevent browser context menu
                                                        if (isDayAssigned(assignment.id, date)) {
                                                          handleDeleteDayAssignment(assignment.id, date, _e)
                                                        }
                                                      }}                        >
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <span className="text-xs text-muted-foreground/40 dark:text-muted-foreground/80 font-medium">
                              {format(date, 'EEE', { locale: enGB })}
                            </span>
                          </div>
                          {hasMilestone(project.id, date) && (
                            <div className="absolute top-0 right-0 left-0 text-[10px] text-center font-medium pointer-events-none">
                            🚩
                            </div>
                          )}
                          {(isDayAssigned(assignment.id, date) ||
                            isDayInDragRange(assignment.id, date)) && (
                            <div
                              className={cn(
                                'h-5 shadow-sm relative z-20',
                                getAssignmentWidthClass(assignment.id, date),
                                getAssignmentRoundedClass(assignment.id, date),
                                getAssignmentBorderClass(assignment.id, date),
                                'bg-confirmed border-emerald-400',
                                project.status === 'tentative' && 'opacity-60',
                                isDayInDragRange(assignment.id, date) &&
                                  'opacity-50',
                                isAdmin && 'cursor-pointer'
                              )}
                              onMouseDown={(e) => {
                                // Stop propagation to prevent parent cell from starting drag
                                e.stopPropagation()
                              }}
                              onClick={(e) => {
                                if (isDayAssigned(assignment.id, date)) {
                                  handleAssignmentClick(assignment.id, date, e)
                                }
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault()
                                if (isDayAssigned(assignment.id, date)) {
                                  handleDeleteDayAssignment(assignment.id, date, e)
                                }
                              }}
                              style={{ pointerEvents: 'auto' }}
                            >
                              {/* Priority indicators - on last day of range */}
                              {isDayAssigned(assignment.id, date) && isLastDayOfRange(assignment.id, date) && (
                                <>
                                  {getGroupPriority(assignment.id, date) === 'high' && (
                                    <span className="absolute top-1/2 -translate-y-1/2 right-0 text-[9px] leading-none z-30 pointer-events-none">
                                      {'🔥'}
                                    </span>
                                  )}
                                  {getGroupPriority(assignment.id, date) === 'low' && (
                                    <span className="absolute top-1/2 -translate-y-1/2 right-0 text-[9px] leading-none z-30 pointer-events-none">
                                      {'🤷‍♂️'}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      {/* Comment overlay rendered at row level to appear above all bar segments */}
                      {(() => {
                        // Find all contiguous ranges with comments for this assignment
                        const commentRanges: { date: Date; comment: string }[] = []
                        dates.forEach(date => {
                          if (isDayAssigned(assignment.id, date) && isFirstDayOfRange(assignment.id, date)) {
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
                                  left: 256 + getDatePixelOffset(date) + 4, // 256px = w-64 sidebar, +4 for padding
                                  width: getCommentOverlayWidth(assignment.id, date),
                                }}
                                onClick={(e) => {
                                  // Find the actual date clicked based on X position
                                  const row = e.currentTarget.closest('.relative') as HTMLElement
                                  if (row) {
                                    const clickedDate = getDateFromClickX(e.clientX, row)
                                    if (clickedDate && isDayAssigned(assignment.id, clickedDate)) {
                                      handleAssignmentClick(assignment.id, clickedDate, e)
                                    }
                                  }
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault()
                                  // Find the actual date clicked based on X position
                                  const row = e.currentTarget.closest('.relative') as HTMLElement
                                  if (row) {
                                    const clickedDate = getDateFromClickX(e.clientX, row)
                                    if (clickedDate && isDayAssigned(assignment.id, clickedDate)) {
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
