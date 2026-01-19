/**
 * Timeline Component Library
 *
 * A collection of reusable components for rendering project/member timeline views
 * with drag-to-assign functionality, milestones, day-offs, and assignment management.
 *
 * @module timeline
 */

// Main timeline component
export { default } from '../Timeline'

// View components
export { TimelineViewContent } from './TimelineViewContent'
export { AssignmentRow } from './AssignmentRow'

// Header components
export { TimelineHeader } from './TimelineHeader'
export { TimelineItemHeader } from './TimelineItemHeader'

// Assignment components
export { ExpandedAssignmentBar } from './ExpandedAssignmentBar'
export { CollapsedAssignmentBar } from './CollapsedAssignmentBar'
export { AssignmentCommentOverlay } from './AssignmentCommentOverlay'

// Indicator components
export { MilestoneIndicator } from './MilestoneIndicator'
export { DayOffIndicator } from './DayOffIndicator'

// Types
export type {
  ZoomLevel,
  TimelineViewContentProps,
  AssignmentRowProps,
  AssignmentCommentOverlayProps,
  TimelineHeaderProps,
  TimelineItemHeaderProps,
  ExpandedAssignmentBarProps,
  CollapsedAssignmentBarProps,
  MilestoneIndicatorProps,
  DayOffIndicatorProps,
  TimelineWarning,
  EditPopoverState,
} from './types'
