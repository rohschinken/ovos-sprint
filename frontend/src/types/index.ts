/**
 * Central Type Definitions
 *
 * This file contains core domain entities, enums, and system-wide types that are shared
 * across the entire application.
 *
 * Feature-specific types have been moved to their respective directories:
 * - Dashboard component types: @/components/dashboard/types
 * - Timeline component types: @/components/timeline/types
 * - Page-level types: @/pages/types
 * - Top-level component types: @/components/types
 */

// ============================================================================
// User & Authentication Types
// ============================================================================

export type UserRole = 'admin' | 'project_manager' | 'user'

export interface User {
  id: number
  email: string
  role: UserRole
  createdAt: string
  // Optional fields for team filter auto-initialization
  teamMember?: {
    id: number
    firstName: string
    lastName: string
    email: string | null
  }
  teams?: number[]
}

// ============================================================================
// Organization & Team Types
// ============================================================================

export interface Team {
  id: number
  name: string
  createdAt: string
}

export interface Customer {
  id: number
  name: string
  icon: string | null
  managerId: number | null
  manager?: { id: number; email: string }
  createdAt: string
}

export interface WorkSchedule {
  sun: boolean
  mon: boolean
  tue: boolean
  wed: boolean
  thu: boolean
  fri: boolean
  sat: boolean
}

export interface TeamMember {
  id: number
  userId?: number | null
  firstName: string
  lastName: string
  email?: string | null
  avatarUrl: string | null
  workSchedule: string
  createdAt: string
}

// ============================================================================
// Project & Assignment Types
// ============================================================================

export type ProjectStatus = 'confirmed' | 'tentative' | 'archived'

export interface Project {
  id: number
  customerId: number
  customer?: Customer
  name: string
  status: ProjectStatus
  managerId: number | null
  manager?: { id: number; email: string }
  createdAt: string
}

export interface ProjectAssignment {
  id: number
  projectId: number
  teamMemberId: number
  createdAt: string
}

export interface ProjectAssignmentWithDetails extends ProjectAssignment {
  project: Project
  teamMember: TeamMember
  dayAssignments: DayAssignment[]
}

export interface DayAssignment {
  id: number
  projectAssignmentId: number
  date: string
  comment: string | null
  createdAt: string
}

export interface TeamTeamMember {
  teamId: number
  teamMemberId: number
}

// ============================================================================
// System Settings & Configuration Types
// ============================================================================

export interface Invitation {
  id: number
  email: string
  token: string
  expiresAt: string
  usedAt: string | null
  createdAt: string
}

export interface Settings {
  id: number
  userId: number
  key: string
  value: string
}

// ============================================================================
// Timeline-Related Domain Types
// ============================================================================

export interface Milestone {
  id: number
  projectId: number
  date: string
  name: string | null
  createdAt: string
}

export interface DayOff {
  id: number
  teamMemberId: number
  date: string
  createdAt: string
}

export type AssignmentPriority = 'high' | 'normal' | 'low'

export interface AssignmentGroup {
  id: number
  projectAssignmentId: number
  startDate: string
  endDate: string
  priority: AssignmentPriority
  comment: string | null
  createdAt: string
}

// ============================================================================
// Extended Types with Relations
// ============================================================================

export interface TeamWithMembers extends Team {
  members: TeamMember[]
}

export interface ProjectWithAssignments extends Project {
  assignments: (ProjectAssignment & {
    teamMember: TeamMember
    dayAssignments: DayAssignment[]
  })[]
}

export interface TeamMemberWithProjects extends TeamMember {
  assignments: (ProjectAssignment & {
    project: Project
    dayAssignments: DayAssignment[]
  })[]
}

// ============================================================================
// View Modes & UI State Types
// ============================================================================

export type TimelineViewMode = 'by-project' | 'by-member'
export type PageViewMode = 'cards' | 'list'

// ============================================================================
// System Enums
// ============================================================================

export type SettingKey =
  | 'warnWeekendAssignments'
  | 'showOverlapVisualization'
  | 'timelinePrevDays'
  | 'timelineNextDays'
