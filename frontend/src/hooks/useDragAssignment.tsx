import { useEffect, useMemo, useCallback } from 'react'
import { UseMutationResult } from '@tanstack/react-query'
import { format, addDays } from 'date-fns'
import debounce from 'lodash.debounce'
import { isHoliday, getHolidayName } from '@/lib/holidays'
import { useDragContext } from '@/contexts/DragContext'
import type { TimelineWarning } from '@/components/timeline/types'

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
  createBatchDayAssignmentsMutation: UseMutationResult<any, unknown, { projectAssignmentId: number; dates: string[] }, unknown>,
  setTimelineWarning: (warning: TimelineWarning | null) => void,
  isNonWorkingDay: (memberId: number, date: Date) => boolean
) {
  // Use DragContext instead of local state to prevent Timeline re-renders
  const { getDragState, setDragState: setContextDragState, isDayInDragRange } = useDragContext()

  /**
   * Debounced version of setDragState for smooth drag updates (~60fps)
   */
  const debouncedSetDragState = useMemo(
    () => debounce((newState: { assignmentId: number | null; startDate: Date | null; endDate: Date | null }) => {
      setContextDragState(newState)
    }, 16), // ~60fps
    [setContextDragState]
  )

  /**
   * Cleanup debounced function on unmount
   */
  useEffect(() => {
    return () => {
      debouncedSetDragState.cancel()
    }
  }, [debouncedSetDragState])

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
  const handleMouseDown = useCallback((assignmentId: number, date: Date, event: React.MouseEvent) => {
    if (!canEditAssignment(assignmentId)) return

    // Don't start drag if it's a right-click or CTRL/CMD+click (these are for deletion)
    if (event.button === 2 || event.ctrlKey || event.metaKey) {
      return
    }

    // Always set drag state - warnings will be checked in handleMouseUp
    setContextDragState({
      assignmentId,
      startDate: date,
      endDate: date,
    })
  }, [setContextDragState])

  /**
   * Handle mouse enter on date cell during drag
   */
  const handleMouseEnter = useCallback((date: Date) => {
    const currentState = getDragState()
    if (currentState.assignmentId && currentState.startDate) {
      debouncedSetDragState({
        ...currentState,
        endDate: date,
      })
    }
  }, [getDragState, debouncedSetDragState])

  /**
   * Handle mouse up to complete drag and create assignments
   */
  const handleMouseUp = useCallback(() => {
    const dragState = getDragState()

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
              // User confirmed, create all assignments in batch including non-working days
              const dates: string[] = []
              for (let i = 0; i <= daysDiff; i++) {
                const date = addDays(start, i)
                dates.push(format(date, 'yyyy-MM-dd'))
              }
              createBatchDayAssignmentsMutation.mutate({
                projectAssignmentId: dragState.assignmentId!,
                dates,
              })
              setTimelineWarning(null)
            },
            onSkip: () => {
              // User chose to skip non-working days, filter them out
              const workingDates: string[] = []
              for (let i = 0; i <= daysDiff; i++) {
                const date = addDays(start, i)
                // Only include working days (skip holidays and non-working days)
                if (!isHoliday(date) && !isNonWorkingDay(assignment.teamMemberId, date)) {
                  workingDates.push(format(date, 'yyyy-MM-dd'))
                }
              }
              // Only create assignments if there are working days in the range
              if (workingDates.length > 0) {
                createBatchDayAssignmentsMutation.mutate({
                  projectAssignmentId: dragState.assignmentId!,
                  dates: workingDates,
                })
              }
              setTimelineWarning(null)
            },
          })

          // Clear drag state but don't create assignments yet (waiting for confirmation)
          setContextDragState({ assignmentId: null, startDate: null, endDate: null })
          return
        }
      }

      // No warnings needed, create assignments directly in batch
      const dates: string[] = []
      for (let i = 0; i <= daysDiff; i++) {
        const date = addDays(start, i)
        dates.push(format(date, 'yyyy-MM-dd'))
      }
      createBatchDayAssignmentsMutation.mutate({
        projectAssignmentId: dragState.assignmentId,
        dates,
      })
    }

    setContextDragState({ assignmentId: null, startDate: null, endDate: null })
  }, [getDragState, setContextDragState, projectAssignments, members, settings, isNonWorkingDay, setTimelineWarning, createBatchDayAssignmentsMutation])

  // Global mouseup listener to complete drag even if mouse leaves component
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      const currentState = getDragState()
      if (currentState.assignmentId) {
        handleMouseUp()
      }
    }

    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [getDragState, handleMouseUp])

  return {
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
    isDayInDragRange,
    canEditAssignment,
  }
}
