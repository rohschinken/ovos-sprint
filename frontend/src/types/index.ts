export type UserRole = 'admin' | 'user'

export interface User {
  id: number
  email: string
  role: UserRole
  createdAt: string
}

export interface Team {
  id: number
  name: string
  createdAt: string
}

export interface TeamMember {
  id: number
  firstName: string
  lastName: string
  avatarUrl: string | null
  createdAt: string
}

export type ProjectStatus = 'confirmed' | 'tentative'

export interface Project {
  id: number
  customer: string
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
