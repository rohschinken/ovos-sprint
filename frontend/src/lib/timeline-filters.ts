/**
 * Timeline Filter Functions
 *
 * Pure functions for filtering members and projects based on various criteria.
 * These handle team filtering, tentative project filtering, and removing empty items.
 */

/**
 * Filter members based on selected teams
 * If no teams selected, returns all members
 */
export function filterMembersByTeams(
  members: any[],
  teamMemberRelationships: any[],
  selectedTeamIds: number[]
): any[] {
  if (selectedTeamIds.length === 0) {
    return members
  }

  // Create a Set for O(1) lookup of member IDs in selected teams
  const selectedTeamIdSet = new Set(selectedTeamIds)
  const memberIdsInSelectedTeams = new Set<number>()

  teamMemberRelationships.forEach(rel => {
    if (selectedTeamIdSet.has(rel.teamId)) {
      memberIdsInSelectedTeams.add(rel.teamMemberId)
    }
  })

  return members.filter((member) => memberIdsInSelectedTeams.has(member.id))
}

/**
 * Filter projects based on selected teams
 * Only shows projects with members from the selected teams
 * If no teams selected, returns all projects
 */
export function filterProjectsByTeams(
  projects: any[],
  projectAssignments: any[],
  teamMemberRelationships: any[],
  selectedTeamIds: number[]
): any[] {
  if (selectedTeamIds.length === 0) {
    return projects
  }

  // Create indexes for O(1) lookup instead of nested .find() calls
  const memberIdToTeamIds = new Map<number, Set<number>>()
  teamMemberRelationships.forEach(rel => {
    if (!memberIdToTeamIds.has(rel.teamMemberId)) {
      memberIdToTeamIds.set(rel.teamMemberId, new Set())
    }
    memberIdToTeamIds.get(rel.teamMemberId)!.add(rel.teamId)
  })

  const assignmentsByProject = new Map<number, any[]>()
  projectAssignments.forEach(pa => {
    if (!assignmentsByProject.has(pa.projectId)) {
      assignmentsByProject.set(pa.projectId, [])
    }
    assignmentsByProject.get(pa.projectId)!.push(pa)
  })

  const selectedTeamIdSet = new Set(selectedTeamIds)

  // Now filter with O(1) lookups instead of nested loops
  return projects.filter((project) => {
    const assignments = assignmentsByProject.get(project.id) || []

    return assignments.some((assignment: any) => {
      const teamIds = memberIdToTeamIds.get(assignment.teamMemberId)
      if (!teamIds) return false

      // Check if any team ID matches selected teams
      for (const teamId of teamIds) {
        if (selectedTeamIdSet.has(teamId)) return true
      }
      return false
    })
  })
}

/**
 * Filter out tentative and archived projects
 * If showTentative is true, returns all non-archived projects
 * If false, returns only confirmed projects (non-archived)
 * Archived projects are always filtered out from timeline
 */
export function filterTentativeProjects(
  projects: any[],
  showTentative: boolean
): any[] {
  // Always filter out archived projects from timeline
  const nonArchivedProjects = projects.filter((project) => project.status !== 'archived')

  if (showTentative) {
    return nonArchivedProjects
  }

  return nonArchivedProjects.filter((project) => project.status === 'confirmed')
}

/**
 * Filter out projects without any members assigned
 */
export function filterProjectsWithMembers(
  projects: any[],
  projectAssignments: any[]
): any[] {
  // Create a Set of project IDs that have assignments
  const projectIdsWithAssignments = new Set<number>()
  projectAssignments.forEach(pa => {
    projectIdsWithAssignments.add(pa.projectId)
  })

  return projects.filter((project) => projectIdsWithAssignments.has(project.id))
}

/**
 * Filter out members without any project assignments
 * If showTentative is false, only counts confirmed project assignments
 * Always excludes archived project assignments
 */
export function filterMembersWithProjects(
  members: any[],
  projectAssignments: any[],
  projects: any[],
  showTentative: boolean
): any[] {
  // Create project lookup map for O(1) access
  const projectById = new Map<number, any>()
  projects.forEach(p => {
    projectById.set(p.id, p)
  })

  // Index assignments by member ID
  const assignmentsByMember = new Map<number, any[]>()
  projectAssignments.forEach(pa => {
    if (!assignmentsByMember.has(pa.teamMemberId)) {
      assignmentsByMember.set(pa.teamMemberId, [])
    }
    assignmentsByMember.get(pa.teamMemberId)!.push(pa)
  })

  return members.filter((member) => {
    const assignments = assignmentsByMember.get(member.id) || []

    // Always filter out archived projects - use Map lookup instead of .find()
    const nonArchivedAssignments = assignments.filter((pa: any) => {
      const project = projectById.get(pa.projectId)
      return project && project.status !== 'archived'
    })

    // If showTentative is false, only count confirmed project assignments
    if (!showTentative) {
      const confirmedAssignments = nonArchivedAssignments.filter((pa: any) => {
        const project = projectById.get(pa.projectId)
        return project && project.status === 'confirmed'
      })
      return confirmedAssignments.length > 0
    }

    return nonArchivedAssignments.length > 0
  })
}

/**
 * Apply all project filters in sequence
 * 1. Filter by teams
 * 2. Remove projects without members
 * 3. Filter tentative projects
 */
export function applyProjectFilters(
  projects: any[],
  projectAssignments: any[],
  teamMemberRelationships: any[],
  selectedTeamIds: number[],
  showTentative: boolean
): any[] {
  let filtered = filterProjectsByTeams(
    projects,
    projectAssignments,
    teamMemberRelationships,
    selectedTeamIds
  )

  filtered = filterProjectsWithMembers(filtered, projectAssignments)

  filtered = filterTentativeProjects(filtered, showTentative)

  return filtered
}

/**
 * Apply all member filters in sequence
 * 1. Filter by teams
 * 2. Remove members without projects
 */
export function applyMemberFilters(
  members: any[],
  teamMemberRelationships: any[],
  selectedTeamIds: number[],
  projectAssignments: any[],
  projects: any[],
  showTentative: boolean
): any[] {
  let filtered = filterMembersByTeams(
    members,
    teamMemberRelationships,
    selectedTeamIds
  )

  filtered = filterMembersWithProjects(
    filtered,
    projectAssignments,
    projects,
    showTentative
  )

  return filtered
}
