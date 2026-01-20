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

  return members.filter((member) =>
    teamMemberRelationships.some(
      (rel) =>
        rel.teamMemberId === member.id &&
        selectedTeamIds.includes(rel.teamId)
    )
  )
}

/**
 * Filter projects based on selected teams
 * Only shows projects with members from the selected teams
 * If no teams selected, returns all projects
 */
export function filterProjectsByTeams(
  projects: any[],
  projectAssignments: any[],
  members: any[],
  teamMemberRelationships: any[],
  selectedTeamIds: number[]
): any[] {
  if (selectedTeamIds.length === 0) {
    return projects
  }

  return projects.filter((project) => {
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
  return projects.filter((project) => {
    const assignments = projectAssignments.filter(
      (pa: any) => pa.projectId === project.id
    )
    return assignments.length > 0
  })
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
  return members.filter((member) => {
    const assignments = projectAssignments.filter(
      (pa: any) => pa.teamMemberId === member.id
    )

    // Always filter out archived projects
    const nonArchivedAssignments = assignments.filter((pa: any) => {
      const project = projects.find((p) => p.id === pa.projectId)
      return project && project.status !== 'archived'
    })

    // If showTentative is false, only count confirmed project assignments
    if (!showTentative) {
      const confirmedAssignments = nonArchivedAssignments.filter((pa: any) => {
        const project = projects.find((p) => p.id === pa.projectId)
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
  members: any[],
  teamMemberRelationships: any[],
  selectedTeamIds: number[],
  showTentative: boolean
): any[] {
  let filtered = filterProjectsByTeams(
    projects,
    projectAssignments,
    members,
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
