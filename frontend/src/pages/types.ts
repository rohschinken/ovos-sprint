/**
 * Page-level type definitions
 *
 * Consolidates types used across multiple page components.
 */

/**
 * Cascade info for user deletion
 * Shows what will be deleted when a user is removed
 */
export interface UserCascadeInfo {
  settings: number
  linkedTeamMembers: number
}

/**
 * Cascade info for project deletion
 * Shows what will be deleted when a project is removed
 */
export interface ProjectCascadeInfo {
  assignments: number
  dayAssignments: number
  milestones: number
}

/**
 * Cascade info for customer deletion
 * Shows what will be deleted when a customer is removed
 */
export interface CustomerCascadeInfo {
  projects: number
  assignments: number
  dayAssignments: number
  milestones: number
}
