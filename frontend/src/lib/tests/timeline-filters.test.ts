import { describe, it, expect } from 'vitest'
import {
  filterMembersByTeams,
  filterProjectsByTeams,
  filterTentativeProjects,
  applyProjectFilters,
  applyMemberFilters,
} from '../timeline-filters'

describe('Timeline Filters', () => {
  // Mock data
  const mockMembers = [
    { id: 1, firstName: 'John', lastName: 'Doe' },
    { id: 2, firstName: 'Jane', lastName: 'Smith' },
    { id: 3, firstName: 'Bob', lastName: 'Johnson' },
  ]

  const mockProjects = [
    { id: 1, name: 'Project Alpha', status: 'confirmed' },
    { id: 2, name: 'Project Beta', status: 'tentative' },
    { id: 3, name: 'Project Gamma', status: 'confirmed' },
  ]

  const mockProjectAssignments = [
    { id: 1, projectId: 1, teamMemberId: 1 },
    { id: 2, projectId: 1, teamMemberId: 2 },
    { id: 3, projectId: 2, teamMemberId: 2 },
    { id: 4, projectId: 3, teamMemberId: 3 },
  ]

  const mockTeamMemberRelationships = [
    { teamId: 1, teamMemberId: 1 }, // John in Team 1
    { teamId: 1, teamMemberId: 2 }, // Jane in Team 1
    { teamId: 2, teamMemberId: 2 }, // Jane in Team 2
    { teamId: 2, teamMemberId: 3 }, // Bob in Team 2
  ]

  describe('filterMembersByTeams', () => {
    it('returns all members when no teams selected', () => {
      const result = filterMembersByTeams(mockMembers, mockTeamMemberRelationships, [])
      expect(result).toHaveLength(3)
      expect(result).toEqual(mockMembers)
    })

    it('filters members by single team', () => {
      const result = filterMembersByTeams(mockMembers, mockTeamMemberRelationships, [1])
      expect(result).toHaveLength(2)
      expect(result.map((m) => m.id)).toEqual([1, 2]) // John and Jane
    })

    it('filters members by multiple teams', () => {
      const result = filterMembersByTeams(mockMembers, mockTeamMemberRelationships, [1, 2])
      expect(result).toHaveLength(3) // All members belong to at least one team
    })

    it('returns empty array when filtering by non-existent team', () => {
      const result = filterMembersByTeams(mockMembers, mockTeamMemberRelationships, [999])
      expect(result).toHaveLength(0)
    })
  })

  describe('filterProjectsByTeams', () => {
    it('returns all projects when no teams selected', () => {
      const result = filterProjectsByTeams(
        mockProjects,
        mockProjectAssignments,
        mockTeamMemberRelationships,
        []
      )
      expect(result).toHaveLength(3)
      expect(result).toEqual(mockProjects)
    })

    it('filters projects by team assignments', () => {
      // Team 1 has John and Jane
      // Project 1 has John and Jane -> should show
      // Project 2 has Jane -> should show
      // Project 3 has Bob (Team 2 only) -> should NOT show
      const result = filterProjectsByTeams(
        mockProjects,
        mockProjectAssignments,
        mockTeamMemberRelationships,
        [1]
      )
      expect(result).toHaveLength(2)
      expect(result.map((p) => p.id)).toEqual([1, 2])
    })

    it('shows all projects when filtering by all teams', () => {
      const result = filterProjectsByTeams(mockProjects, mockProjectAssignments, mockTeamMemberRelationships,
        [1, 2]
      )
      expect(result).toHaveLength(3)
    })

    it('returns empty array when filtering by team with no project assignments', () => {
      const result = filterProjectsByTeams(mockProjects, mockProjectAssignments, mockTeamMemberRelationships,
        [999]
      )
      expect(result).toHaveLength(0)
    })

    // Regression test for bug fixed on 2026-01-19
    // Issue: Timeline displayed all projects regardless of team selection
    it('regression: correctly filters projects when team is selected (not just renames)', () => {
      // This test ensures we use the actual filtered data, not just renamed raw data
      const team1Projects = filterProjectsByTeams(mockProjects, mockProjectAssignments, mockTeamMemberRelationships,
        [1]
      )

      const team2Projects = filterProjectsByTeams(mockProjects, mockProjectAssignments, mockTeamMemberRelationships,
        [2]
      )

      // Team 1 should show Project 1 and 2 (have John or Jane, both in Team 1)
      expect(team1Projects.map((p) => p.id)).toEqual([1, 2])

      // Team 2 should show Project 1, 2, and 3
      // Project 1 has Jane (Team 1 AND Team 2)
      // Project 2 has Jane (Team 1 AND Team 2)
      // Project 3 has Bob (Team 2 only)
      expect(team2Projects.map((p) => p.id)).toEqual([1, 2, 3])

      // Verify they are DIFFERENT (bug was showing same projects for all teams)
      expect(team1Projects).not.toEqual(team2Projects)
    })
  })

  describe('filterTentativeProjects', () => {
    it('returns all projects when showTentative is true', () => {
      const result = filterTentativeProjects(mockProjects, true)
      expect(result).toHaveLength(3)
      expect(result).toEqual(mockProjects)
    })

    it('filters out tentative projects when showTentative is false', () => {
      const result = filterTentativeProjects(mockProjects, false)
      expect(result).toHaveLength(2)
      expect(result.map((p) => p.id)).toEqual([1, 3])
      expect(result.every((p) => p.status === 'confirmed')).toBe(true)
    })

    it('returns empty array when all projects are tentative and showTentative is false', () => {
      const tentativeOnly = [
        { id: 1, name: 'Project A', status: 'tentative' },
        { id: 2, name: 'Project B', status: 'tentative' },
      ]
      const result = filterTentativeProjects(tentativeOnly, false)
      expect(result).toHaveLength(0)
    })
  })

  describe('applyProjectFilters', () => {
    it('applies both team and tentative filters', () => {
      const result = applyProjectFilters(mockProjects, mockProjectAssignments, mockTeamMemberRelationships,
        [1], // Team 1 only
        false // Hide tentative
      )

      // Team 1 has projects 1 and 2
      // Project 1 is confirmed (show)
      // Project 2 is tentative (hide)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(1)
      expect(result[0].status).toBe('confirmed')
    })

    it('returns all projects when no filters applied', () => {
      const result = applyProjectFilters(mockProjects, mockProjectAssignments, mockTeamMemberRelationships,
        [], // No team filter
        true // Show tentative
      )

      expect(result).toHaveLength(3)
      expect(result).toEqual(mockProjects)
    })
  })

  describe('applyMemberFilters', () => {
    it('filters members by team selection', () => {
      const result = applyMemberFilters(
        mockMembers,
        mockTeamMemberRelationships,
        [1], // Team 1 only
        mockProjectAssignments,
        mockProjects,
        true
      )

      // Team 1 has John (1) and Jane (2)
      expect(result).toHaveLength(2)
      expect(result.map((m) => m.id)).toEqual([1, 2])
    })

    it('returns all members when no team filter applied', () => {
      const result = applyMemberFilters(
        mockMembers,
        mockTeamMemberRelationships,
        [], // No team filter
        mockProjectAssignments,
        mockProjects,
        true
      )

      expect(result).toHaveLength(3)
      expect(result).toEqual(mockMembers)
    })

    // Regression test for bug fixed on 2026-01-19
    // Issue: Timeline displayed all members regardless of team selection
    it('regression: correctly filters members when team is selected (not just renames)', () => {
      const team1Members = applyMemberFilters(
        mockMembers,
        mockTeamMemberRelationships,
        [1],
        mockProjectAssignments,
        mockProjects,
        true
      )

      const team2Members = applyMemberFilters(
        mockMembers,
        mockTeamMemberRelationships,
        [2],
        mockProjectAssignments,
        mockProjects,
        true
      )

      // Team 1 should show John (1) and Jane (2)
      expect(team1Members.map((m) => m.id)).toEqual([1, 2])

      // Team 2 should show Jane (2) and Bob (3)
      expect(team2Members.map((m) => m.id)).toEqual([2, 3])

      // Verify they are DIFFERENT (bug was showing same members for all teams)
      expect(team1Members).not.toEqual(team2Members)
    })
  })
})
