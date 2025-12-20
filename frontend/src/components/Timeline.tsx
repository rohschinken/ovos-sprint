import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/client'
import { TimelineViewMode, Project, TeamMember, Milestone, DayOff } from '@/types'
import { isHoliday, isWeekend, getHolidayName } from '@/lib/holidays'
import { cn, getInitials, getAvatarColor } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { format, addDays, startOfDay, isSameDay, isFirstDayOfMonth, getDay, getISOWeek } from 'date-fns'
import { enGB } from 'date-fns/locale'
import { ChevronDown, ChevronRight, Flag } from 'lucide-react'

interface TimelineProps {
  viewMode: TimelineViewMode
  prevDays: number
  nextDays: number
  isAdmin: boolean
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

  const toggleExpand = (id: number) => {
    const newExpandedSet = new Set(expandedItemsProp)
    if (newExpandedSet.has(id)) {
      newExpandedSet.delete(id)
    } else {
      newExpandedSet.add(id)
    }
    onExpandedItemsChange(Array.from(newExpandedSet))
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

  const handleMouseDown = (assignmentId: number, date: Date, event: React.MouseEvent) => {
    if (!isAdmin) return

    // Don't start drag if it's a right-click or CTRL/CMD+click (these are for deletion)
    if (event.button === 2 || event.ctrlKey || event.metaKey) {
      return
    }

    // Find the assignment to get the member
    const assignment = projectAssignments.find((pa: any) => pa.id === assignmentId)
    const warnWeekend = settings.warnWeekendAssignments !== 'false'

    if (warnWeekend && assignment) {
      // Check if it's a holiday
      if (isHoliday(date)) {
        const holidayName = getHolidayName(date)
        const message = holidayName
          ? `This is a holiday (${holidayName}). Are you sure?`
          : 'This is a holiday. Are you sure?'

        if (!confirm(message)) {
          return
        }
      }
      // Check if it's a non-working day for this member
      else if (isNonWorkingDay(assignment.teamMemberId, date)) {
        const member = members.find((m) => m.id === assignment.teamMemberId)
        const memberName = member ? `${member.firstName} ${member.lastName}` : 'this member'

        if (!confirm(`This is a non-working day for ${memberName}. Are you sure?`)) {
          return
        }
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
    if (!isAdmin) return

    event.preventDefault()
    event.stopPropagation()

    const dayAssignmentId = getDayAssignmentId(assignmentId, date)
    if (!dayAssignmentId) return

    deleteDayAssignmentMutation.mutate(dayAssignmentId)
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

  const handleProjectCellClick = (projectId: number, date: Date, event: React.MouseEvent) => {
    if (!isAdmin || viewMode !== 'by-project') return

    event.preventDefault()
    event.stopPropagation()

    // Check if there's already a milestone
    const milestoneId = getMilestoneId(projectId, date)
    if (milestoneId) {
      // Delete existing milestone if CTRL/CMD+click or right-click
      if (event.ctrlKey || event.metaKey || event.button === 2) {
        deleteMilestoneMutation.mutate(milestoneId)
      }
    } else {
      // Create new milestone on normal click
      if (!event.ctrlKey && !event.metaKey && event.button === 0) {
        createMilestoneMutation.mutate({
          projectId,
          date: format(date, 'yyyy-MM-dd'),
        })
      }
    }
  }

  const handleMemberCellClick = (memberId: number, date: Date, event: React.MouseEvent) => {
    if (!isAdmin || viewMode !== 'by-member') return

    event.preventDefault()
    event.stopPropagation()

    // Check if there's already a day-off
    const existingDayOff = getDayOff(memberId, date)
    const dateStr = format(date, 'yyyy-MM-dd')
    const member = members.find((m) => m.id === memberId)
    const memberName = member ? `${member.firstName} ${member.lastName}` : 'this member'

    if (existingDayOff) {
      // Delete existing day-off if CTRL/CMD+click or right-click
      if (event.ctrlKey || event.metaKey || event.button === 2) {
        if (confirm(`Remove day off for ${memberName} on ${dateStr}?`)) {
          deleteDayOffMutation.mutate(existingDayOff.id)
        }
      }
    } else {
      // Create new day-off on normal click
      if (!event.ctrlKey && !event.metaKey && event.button === 0) {
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
    <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Header */}
          <div className="sticky top-0 bg-background z-10 shadow-sm">
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
            <div className="w-64 p-3 font-semibold border-r bg-muted/30">Project</div>
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
                      <div className="font-semibold text-sm">{project.name}</div>
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
                            isAdmin && 'cursor-pointer hover:bg-muted/30'
                          )}
                          onClick={(e) => handleProjectCellClick(project.id, date, e)}
                          onContextMenu={(e) => handleProjectCellClick(project.id, date, e)}
                        >
                          {hasMilestone(project.id, date) && (
                            <Flag className="h-4 w-4 text-red-600 dark:text-red-500 fill-current absolute top-1 right-1" />
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
                                'bg-confirmed border-emerald-400 dark:border-emerald-500',
                                project.status === 'tentative' && 'opacity-60'
                              )}
                            />
                          )}
                        </div>
                      </TooltipTrigger>
                      {isAdmin && (
                        <TooltipContent side="top" className="text-xs">
                          Add/remove milestone
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
                              isSameDay(date, today) && 'bg-primary/10 border-x-2 border-x-primary',
                              isAdmin && 'cursor-pointer',
                              isFirstDayOfMonth(date) && 'border-l-4 border-l-border',
                              isWeekStart(date, dateIndex) && !isFirstDayOfMonth(date) && 'border-l-4 border-l-muted-foreground'
                            )}
                            onMouseDown={(e) =>
                              handleMouseDown(assignment.id, date, e)
                            }
                            onMouseEnter={() => handleMouseEnter(date)}
                            onClick={(e) => {
                              if ((e.ctrlKey || e.metaKey) && isDayAssigned(assignment.id, date)) {
                                handleDeleteDayAssignment(assignment.id, date, e)
                              }
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault() // Prevent browser context menu
                              if (isDayAssigned(assignment.id, date)) {
                                handleDeleteDayAssignment(assignment.id, date, e)
                              }
                            }}
                          >
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <span className="text-xs text-muted-foreground/40 font-medium">
                                {format(date, 'EEE', { locale: enGB })}
                              </span>
                            </div>
                            {(isDayAssigned(assignment.id, date) ||
                              isDayInDragRange(assignment.id, date)) && (
                              <div
                                className={cn(
                                  'h-6 shadow-sm relative z-20',
                                  getAssignmentWidthClass(assignment.id, date),
                                  getAssignmentRoundedClass(assignment.id, date),
                                  getAssignmentBorderClass(assignment.id, date),
                                  // Color orange if overlap, otherwise green
                                  hasOverlap(member.id, date, 'member')
                                    ? 'bg-orange-500 border-orange-400 dark:bg-orange-400 dark:border-orange-500'
                                    : 'bg-confirmed border-emerald-400 dark:border-emerald-500',
                                  project.status === 'tentative' && !hasOverlap(member.id, date, 'member') && 'opacity-60',
                                  isDayInDragRange(assignment.id, date) &&
                                    'opacity-50'
                                )}
                                onMouseDown={(e) => {
                                  // Stop propagation to prevent parent cell from starting drag
                                  e.stopPropagation()
                                }}
                                style={{ pointerEvents: 'auto' }}
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
    </div>
  ) : (
    // By Member view
    <div className="overflow-x-auto">
      <div className="min-w-max">
        {/* Header */}
        <div className="sticky top-0 bg-background z-10 shadow-sm">
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
          <div className="w-64 p-3 font-semibold border-r bg-muted/30">Team Member</div>
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
                          isAdmin && 'cursor-pointer hover:bg-muted/30'
                        )}
                        onClick={(e) => handleMemberCellClick(member.id, date, e)}
                        onContextMenu={(e) => handleMemberCellClick(member.id, date, e)}
                      >
                        {isDayOff(member.id, date) && (
                          <div className="absolute bottom-0 left-0 right-0 text-[10px] text-dayOffText text-center font-medium pointer-events-none">
                            Day Off
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
                                ? 'bg-orange-500 border-orange-400 dark:bg-orange-400 dark:border-orange-500'
                                : 'bg-confirmed border-emerald-400 dark:border-emerald-500',
                              // Reduce opacity for tentative (when not all assignments are confirmed)
                              !hasOverlap(member.id, date, 'member') && !memberHasConfirmedAssignmentOnDate(member.id, date) && 'opacity-60'
                            )}
                          />
                        )}
                      </div>
                    </TooltipTrigger>
                    {isAdmin && (
                      <TooltipContent side="top" className="text-xs">
                        Add/remove day off
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
                    <div key={assignment.id} className="flex border-b bg-background/30 hover:bg-muted/20 transition-colors">
                      <div
                        className={cn(
                          'w-64 p-2 pl-10 border-r bg-background/50',
                          project.status === 'tentative' && 'opacity-50'
                        )}
                      >
                        <div className="text-xs font-medium">{project.name}</div>
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
                          onMouseDown={(e) =>
                            handleMouseDown(assignment.id, date, e)
                          }
                          onMouseEnter={() => handleMouseEnter(date)}
                          onClick={(e) => {
                            if ((e.ctrlKey || e.metaKey) && isDayAssigned(assignment.id, date)) {
                              handleDeleteDayAssignment(assignment.id, date, e)
                            }
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault() // Prevent browser context menu
                            if (isDayAssigned(assignment.id, date)) {
                              handleDeleteDayAssignment(assignment.id, date, e)
                            }
                          }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <span className="text-xs text-muted-foreground/40 font-medium">
                              {format(date, 'EEE', { locale: enGB })}
                            </span>
                          </div>
                          {isDayOff(member.id, date) && (
                            <div className="absolute bottom-0 left-0 right-0 text-[10px] text-dayOffText text-center font-medium pointer-events-none">
                              Day Off
                            </div>
                          )}
                          {hasMilestone(project.id, date) && (
                            <Flag className="h-4 w-4 text-red-600 dark:text-red-500 fill-current absolute top-1 right-1 pointer-events-none" />
                          )}
                          {(isDayAssigned(assignment.id, date) ||
                            isDayInDragRange(assignment.id, date)) && (
                            <div
                              className={cn(
                                'h-6 shadow-sm',
                                getAssignmentWidthClass(assignment.id, date),
                                getAssignmentRoundedClass(assignment.id, date),
                                getAssignmentBorderClass(assignment.id, date),
                                'bg-confirmed border-emerald-400 dark:border-emerald-500',
                                project.status === 'tentative' && 'opacity-60',
                                isDayInDragRange(assignment.id, date) &&
                                  'opacity-50'
                              )}
                              onMouseDown={(e) => {
                                // Stop propagation to prevent parent cell from starting drag
                                e.stopPropagation()
                              }}
                              style={{ pointerEvents: 'auto' }}
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

  return <TooltipProvider>{content}</TooltipProvider>
}
