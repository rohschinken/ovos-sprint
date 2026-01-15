import { useState } from 'react'
import { getContiguousRangeForDate } from '@/lib/timeline-helpers'
import { AssignmentGroup } from '@/types'

/**
 * Edit popover state interface
 */
export interface EditPopoverState {
  open: boolean
  position: { x: number; y: number }
  projectAssignmentId: number
  dateRange: { start: string; end: string }
  group: AssignmentGroup | null
}

/**
 * Custom hook for managing assignment edit popover state
 *
 * Handles popover state, positioning, and click handling for editing
 * assignment groups (priority and comments).
 *
 * @param canEditAssignment - Function to check if assignment can be edited
 * @param dayAssignments - Array of day assignments
 * @param getGroupForDate - Function to get assignment group for a specific date
 * @returns Object with popover state and handler functions
 */
export function useEditPopover(
  canEditAssignment: (assignmentId: number) => boolean,
  dayAssignments: any[],
  getGroupForDate: (assignmentId: number, date: Date) => AssignmentGroup | null
) {
  const [editPopover, setEditPopover] = useState<EditPopoverState | null>(null)

  /**
   * Handle click on assignment bar to open edit popover
   */
  const handleAssignmentClick = (
    assignmentId: number,
    date: Date,
    event: React.MouseEvent
  ) => {
    if (!canEditAssignment(assignmentId)) return
    if (event.ctrlKey || event.metaKey) return // Don't interfere with delete action

    event.stopPropagation()

    const range = getContiguousRangeForDate(dayAssignments, assignmentId, date)
    const group = getGroupForDate(assignmentId, date)

    setEditPopover({
      open: true,
      position: { x: event.clientX, y: event.clientY },
      projectAssignmentId: assignmentId,
      dateRange: range,
      group,
    })
  }

  /**
   * Close the edit popover
   */
  const closeEditPopover = () => {
    setEditPopover(null)
  }

  return {
    editPopover,
    setEditPopover,
    handleAssignmentClick,
    closeEditPopover,
  }
}
