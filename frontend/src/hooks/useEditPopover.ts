import { useState } from 'react'
import { format } from 'date-fns'
import api from '@/api/client'
import type { AssignmentGroup } from '@/types'
import type { EditPopoverState } from '@/components/timeline/types'

/**
 * Custom hook for managing assignment edit popover state
 *
 * Handles popover state, positioning, and click handling for editing
 * assignment groups (priority and comments).
 *
 * @param canEditAssignment - Function to check if assignment can be edited
 * @param getGroupForDate - Function to get assignment group for a specific date
 * @returns Object with popover state and handler functions
 */
export function useEditPopover(
  canEditAssignment: (assignmentId: number) => boolean,
  getGroupForDate: (assignmentId: number, date: Date) => AssignmentGroup | null
) {
  const [editPopover, setEditPopover] = useState<EditPopoverState | null>(null)

  /**
   * Handle click on assignment bar to open edit popover
   */
  const handleAssignmentClick = async (
    assignmentId: number,
    date: Date,
    event: React.MouseEvent
  ) => {
    if (!canEditAssignment(assignmentId)) return
    if (event.ctrlKey || event.metaKey) return // Don't interfere with delete action

    event.stopPropagation()

    try {
      // Fetch the contiguous date range around the clicked date
      // This handles both: dates outside visible range AND split assignments (with gaps)
      const dateStr = format(date, 'yyyy-MM-dd')
      const response = await api.get(`/assignments/projects/${assignmentId}/date-range`, {
        params: { date: dateStr }
      })
      const range = response.data as { start: string; end: string }

      const group = getGroupForDate(assignmentId, date)

      setEditPopover({
        open: true,
        position: { x: event.clientX, y: event.clientY },
        projectAssignmentId: assignmentId,
        dateRange: range,
        group,
      })
    } catch (error) {
      console.error('Failed to fetch assignment date range:', error)
    }
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
