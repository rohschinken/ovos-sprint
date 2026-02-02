import type {
  Project,
  AssignmentGroup,
  AssignmentPriority,
  TimelineViewMode,
  PageViewMode,
} from '@/types'

/**
 * Top-level component prop types
 */

/**
 * Props for the Timeline component
 */
export interface TimelineProps {
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
  showOverlaps: boolean
  showTentative: boolean
  showWeekends: boolean
  hideEmptyRows: boolean
  warnWeekends: boolean
}

/**
 * Props for the AssignMemberDialog component
 */
export interface AssignMemberDialogProps {
  project: Project
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Props for the AssignmentEditPopover component
 */
export interface AssignmentEditPopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  position: { x: number; y: number }
  group: AssignmentGroup | null
  projectAssignmentId: number
  dateRange: { start: string; end: string }
  onSave: (data: {
    priority: AssignmentPriority
    comment: string | null
    startDate?: string
    endDate?: string
  }) => void
}

/**
 * Props for the ViewModeToggle component
 */
export interface ViewModeToggleProps {
  viewMode: PageViewMode
  onViewModeChange: (mode: PageViewMode) => void
}
