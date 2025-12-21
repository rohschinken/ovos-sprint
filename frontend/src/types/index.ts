export type UserRole = 'admin' | 'user'

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

export interface Team {
  id: number
  name: string
  createdAt: string
}

export interface Customer {
  id: number
  name: string
  icon: string | null
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

export type ProjectStatus = 'confirmed' | 'tentative'

export interface Project {
  id: number
  customerId: number
  customer?: Customer
  name: string
  status: ProjectStatus
  createdAt: string
}

export interface ProjectAssignment {
  id: number
  projectId: number
  teamMemberId: number
  createdAt: string
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

// Extended types with relations
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

// View modes for timeline
export type TimelineViewMode = 'by-project' | 'by-member'

// Settings keys
export type SettingKey =
  | 'warnWeekendAssignments'
  | 'showOverlapVisualization'
  | 'timelinePrevDays'
  | 'timelineNextDays'
