import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import api from '@/api/client'
import { applyProjectFilters, applyMemberFilters } from '@/lib/timeline-filters'
import {
  Project,
  TeamMember,
  Milestone,
  DayOff,
  AssignmentGroup,
} from '@/types'

/**
 * Custom hook for fetching all timeline data with queries
 *
 * Fetches all necessary data for the timeline view including:
 * - Projects
 * - Team members
 * - Project assignments
 * - Day assignments
 * - Milestones
 * - Day offs
 * - Settings
 * - Assignment groups
 * - Team member relationships
 *
 * Also applies filtering based on selected teams and tentative status.
 *
 * @param startDate - Start date for date-range queries
 * @param endDate - End date for date-range queries
 * @param selectedTeamIds - Array of selected team IDs for filtering
 * @param showTentative - Whether to show tentative projects
 * @param dates - Array of dates in the timeline
 * @returns Object with all data and loading state
 */
export function useTimelineData(
  startDate: Date,
  endDate: Date,
  selectedTeamIds: number[],
  showTentative: boolean,
  _dates: Date[]
) {
  // Fetch all projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await api.get('/projects')
      return response.data as Project[]
    },
  })

  // Fetch all team members
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const response = await api.get('/members')
      return response.data as TeamMember[]
    },
  })

  // Fetch project assignments
  const { data: projectAssignments = [], isLoading: projectAssignmentsLoading } = useQuery({
    queryKey: ['assignments', 'projects'],
    queryFn: async () => {
      const response = await api.get('/assignments/projects')
      return response.data
    },
  })

  // Fetch day assignments for date range
  const { data: dayAssignments = [], isLoading: dayAssignmentsLoading } = useQuery({
    queryKey: [
      'assignments',
      'days',
      format(startDate, 'yyyy-MM-dd'),
      format(endDate, 'yyyy-MM-dd'),
    ],
    queryFn: async () => {
      const response = await api.get('/assignments/days', {
        params: {
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
        },
      })
      return response.data
    },
  })

  // Fetch milestones for date range
  const { data: milestones = [], isLoading: milestonesLoading } = useQuery({
    queryKey: [
      'milestones',
      format(startDate, 'yyyy-MM-dd'),
      format(endDate, 'yyyy-MM-dd'),
    ],
    queryFn: async () => {
      const response = await api.get('/milestones', {
        params: {
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
        },
      })
      return response.data as Milestone[]
    },
  })

  // Fetch day offs for date range
  const { data: dayOffs = [], isLoading: dayOffsLoading } = useQuery({
    queryKey: [
      'day-offs',
      format(startDate, 'yyyy-MM-dd'),
      format(endDate, 'yyyy-MM-dd'),
    ],
    queryFn: async () => {
      const response = await api.get('/day-offs', {
        params: {
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
        },
      })
      return response.data as DayOff[]
    },
  })

  // Fetch settings
  const { data: settings = {}, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await api.get('/settings')
      return response.data as Record<string, string>
    },
  })

  // Fetch team member relationships
  const { data: teamMemberRelationships = [], isLoading: relationshipsLoading } = useQuery({
    queryKey: ['teams', 'members', 'relationships'],
    queryFn: async () => {
      const response = await api.get('/teams/members/relationships')
      return response.data as { teamId: number; teamMemberId: number }[]
    },
  })

  // Fetch assignment groups for date range
  const { data: assignmentGroups = [], isLoading: assignmentGroupsLoading } = useQuery({
    queryKey: [
      'assignment-groups',
      format(startDate, 'yyyy-MM-dd'),
      format(endDate, 'yyyy-MM-dd'),
    ],
    queryFn: async () => {
      const response = await api.get('/assignments/groups', {
        params: {
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
        },
      })
      return response.data as AssignmentGroup[]
    },
  })

  // Apply filters to projects
  const filteredProjects = applyProjectFilters(
    projects,
    projectAssignments,
    members,
    teamMemberRelationships,
    selectedTeamIds,
    showTentative
  )

  // Apply filters to members
  const filteredMembers = applyMemberFilters(
    members,
    teamMemberRelationships,
    selectedTeamIds,
    projectAssignments,
    projects,
    showTentative
  )

  // Check if any data is still loading
  const isLoading =
    projectsLoading ||
    membersLoading ||
    projectAssignmentsLoading ||
    dayAssignmentsLoading ||
    milestonesLoading ||
    dayOffsLoading ||
    settingsLoading ||
    relationshipsLoading ||
    assignmentGroupsLoading

  return {
    // Raw data
    projects,
    members,
    projectAssignments,
    dayAssignments,
    milestones,
    dayOffs,
    settings,
    teamMemberRelationships,
    assignmentGroups,
    // Filtered data
    filteredProjects,
    filteredMembers,
    // Loading state
    isLoading,
  }
}
