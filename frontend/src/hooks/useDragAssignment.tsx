import { useState, useEffect } from 'react'
import { UseMutationResult } from '@tanstack/react-query'
import { format, addDays } from 'date-fns'
import { isHoliday, getHolidayName } from '@/lib/holidays'

/**
 * Custom hook for managing drag-to-assign functionality in the timeline
 *
 * Handles:
 * - Drag state tracking (start/end dates)
 * - Mouse event handlers for drag interaction
 * - Warning checks for holidays and non-working days
 * - Global mouseup event listener
 *
 * @param projectAssignments - Array of project assignments
 * @param members - Array of team members
 * @param settings - Settings object with configuration
 * @param dayAssignments - Array of day assignments
 * @param dates - Array of dates in the timeline
 * @param createDayAssignmentMutation - Mutation for creating day assignments
 * @param setTimelineWarning - Function to set timeline warning state
 * @param isNonWorkingDay - Function to check if a date is a non-working day for a member
 * @returns Object with drag state and handler functions
 */
export function useDragAssignment(
  projectAssignments: any[],
  members: any[],
  settings: Record<string, string>,
  _dayAssignments: any[],
  _dates: Date[],
  createDayAssignmentMutation: UseMutationResult<any, unknown, { projectAssignmentId: number; date: string }, unknown>,
  setTimelineWarning: (warning: {
    type: 'holiday' | 'non-working-day'
    message: string | React.ReactNode
    onConfirm: () => void
  } | null) => void,
  isNonWorkingDay: (memberId: number, date: Date) => boolean
) {
  const [dragState, setDragState] = useState<{
    assignmentId: number | null
    startDate: Date | null
    endDate: Date | null
  }>({ assignmentId: null, startDate: null, endDate: null })

  /**
   * Check if current user can edit a specific assignment
   * This is passed from parent and used to control drag permissions
   */
  const canEditAssignment = (_assignmentId: number): boolean => {
    // This will be passed from the Timeline component
    // For now, we'll just return true as a placeholder
    return true
  }

  /**
   * Handle mouse down on assignment cell to start drag
   */
  const handleMouseDown = (assignmentId: number, date: Date, event: React.MouseEvent) => {
    if (!canEditAssignment(assignmentId)) return

    // Don't start drag if it's a right-click or CTRL/CMD+click (these are for deletion)
    if (event.button === 2 || event.ctrlKey || event.metaKey) {
      return
    }

    // Always set drag state - warnings will be checked in handleMouseUp
    setDragState({
      assignmentId,
      startDate: date,
      endDate: date,
    })
  }

  /**
   * Handle mouse enter on date cell during drag
   */
  const handleMouseEnter = (date: Date) => {
    if (dragState.assignmentId && dragState.startDate) {
      setDragState({
        ...dragState,
        endDate: date,
      })
    }
  }

  /**
   * Handle mouse up to complete drag and create assignments
   */
  const handleMouseUp = () => {
    if (
      dragState.assignmentId &&
      dragState.startDate &&
      dragState.endDate
    ) {
      const start =
        dragState.startDate < dragState.endDate
          ? dragState.startDate
          : dragState.endDate
      const end =
        dragState.startDate > dragState.endDate
          ? dragState.startDate
          : dragState.endDate

      const daysDiff = Math.floor(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Get the assignment to check member and warnings
      const assignment = projectAssignments.find((pa: any) => pa.id === dragState.assignmentId)
      const warnWeekend = settings.warnWeekendAssignments !== 'false'

      // Check all dates in the range for holidays and non-working days
      if (warnWeekend && assignment) {
        const holidays: string[] = []
        const nonWorkingDays: string[] = []

        for (let i = 0; i <= daysDiff; i++) {
          const date = addDays(start, i)

          if (isHoliday(date)) {
            const holidayName = getHolidayName(date)
            holidays.push(holidayName || format(date, 'MMM d'))
          } else if (isNonWorkingDay(assignment.teamMemberId, date)) {
            nonWorkingDays.push(format(date, 'MMM d'))
          }
        }

        // Show warning if there are holidays or non-working days
        if (holidays.length > 0 || nonWorkingDays.length > 0) {
          const member = members.find((m) => m.id === assignment.teamMemberId)
          const memberName = member ? `${member.firstName} ${member.lastName}` : 'this member'

          // Build message with strong tags for dates
          const message = (
            <>
              {holidays.length > 0 && (
                <>
                  The following dates are holidays: <strong>{holidays.join(', ')}</strong>.{' '}
                </>
              )}
              {nonWorkingDays.length > 0 && (
                <>
                  The following dates are non-working days for {memberName}: <strong>{nonWorkingDays.join(', ')}</strong>.{' '}
                </>
              )}
              Are you sure you want to assign work on these days?
            </>
          )

          setTimelineWarning({
            type: holidays.length > 0 ? 'holiday' : 'non-working-day',
            message,
            onConfirm: () => {
              // User confirmed, create all assignments
              for (let i = 0; i <= daysDiff; i++) {
                const date = addDays(start, i)
                createDayAssignmentMutation.mutate({
                  projectAssignmentId: dragState.assignmentId!,
                  date: format(date, 'yyyy-MM-dd'),
                })
              }
              setTimelineWarning(null)
            },
          })

          // Clear drag state but don't create assignments yet (waiting for confirmation)
          setDragState({ assignmentId: null, startDate: null, endDate: null })
          return
        }
      }

      // No warnings needed, create assignments directly
      for (let i = 0; i <= daysDiff; i++) {
        const date = addDays(start, i)
        createDayAssignmentMutation.mutate({
          projectAssignmentId: dragState.assignmentId,
          date: format(date, 'yyyy-MM-dd'),
        })
      }
    }

    setDragState({ assignmentId: null, startDate: null, endDate: null })
  }

  // Global mouseup listener to complete drag even if mouse leaves component
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragState.assignmentId) {
        handleMouseUp()
      }
    }

    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [dragState])

  return {
    dragState,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    canEditAssignment,
  }
}
