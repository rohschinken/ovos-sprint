/**
 * Timeline Helper Functions
 *
 * Pure utility functions for date calculations, position checking, and assignment logic.
 * These functions have no side effects and can be easily tested.
 */

import { addDays, isSameDay, format } from 'date-fns'
import { ZOOM_PIXEL_WIDTHS, SIDEBAR_WIDTH, PRIORITY_INDICATOR_WIDTH } from './timeline-constants'
import type { ZoomLevel } from './timeline-constants'

/**
 * Check if a specific assignment exists on a given date
 */
export function isDayAssigned(
  dayAssignments: any[],
  assignmentId: number,
  date: Date
): boolean {
  return dayAssignments.some(
    (da: any) =>
      da.projectAssignment?.id === assignmentId &&
      isSameDay(new Date(da.date), date)
  )
}

/**
 * Check if an assignment exists on the previous day
 */
export function isPrevDayAssigned(
  dayAssignments: any[],
  assignmentId: number,
  date: Date
): boolean {
  const prevDate = addDays(date, -1)
  return isDayAssigned(dayAssignments, assignmentId, prevDate)
}

/**
 * Check if an assignment exists on the next day
 */
export function isNextDayAssigned(
  dayAssignments: any[],
  assignmentId: number,
  date: Date
): boolean {
  const nextDate = addDays(date, 1)
  return isDayAssigned(dayAssignments, assignmentId, nextDate)
}

/**
 * Get the contiguous date range containing a specific date for an assignment
 * Expands backwards and forwards from the given date
 */
export function getContiguousRangeForDate(
  dayAssignments: any[],
  assignmentId: number,
  date: Date
): { start: string; end: string } {
  const dateStr = format(date, 'yyyy-MM-dd')
  const dates: string[] = [dateStr]

  // Expand backwards
  let checkDate = addDays(date, -1)
  while (isDayAssigned(dayAssignments, assignmentId, checkDate)) {
    dates.unshift(format(checkDate, 'yyyy-MM-dd'))
    checkDate = addDays(checkDate, -1)
  }

  // Expand forwards
  checkDate = addDays(date, 1)
  while (isDayAssigned(dayAssignments, assignmentId, checkDate)) {
    dates.push(format(checkDate, 'yyyy-MM-dd'))
    checkDate = addDays(checkDate, 1)
  }

  return {
    start: dates[0],
    end: dates[dates.length - 1]
  }
}

/**
 * Check if this is the first day of a contiguous range
 * Used for showing comment indicators
 */
export function isFirstDayOfRange(
  dayAssignments: any[],
  assignmentId: number,
  date: Date
): boolean {
  return !isPrevDayAssigned(dayAssignments, assignmentId, date)
}

/**
 * Check if this is the last day of a contiguous range
 * Used for showing priority indicators
 */
export function isLastDayOfRange(
  dayAssignments: any[],
  assignmentId: number,
  date: Date
): boolean {
  return !isNextDayAssigned(dayAssignments, assignmentId, date)
}

/**
 * Get the number of visible days in the contiguous range containing a date
 * Only counts days that are in the filtered dates array (respects showWeekends setting)
 */
export function getVisibleRangeLengthInDays(
  dayAssignments: any[],
  visibleDates: Date[],
  assignmentId: number,
  startDate: Date
): number {
  const range = getContiguousRangeForDate(dayAssignments, assignmentId, startDate)
  const rangeStart = new Date(range.start)
  const rangeEnd = new Date(range.end)

  // Count visible days in the range
  let count = 1
  for (const d of visibleDates) {
    if (d > startDate && d >= rangeStart && d <= rangeEnd) {
      count++
    }
  }

  return count
}

/**
 * Calculate width for comment overlay
 * Reserves space for priority indicator at the end
 */
export function getCommentOverlayWidth(
  dayAssignments: any[],
  visibleDates: Date[],
  assignmentId: number,
  date: Date,
  zoomLevel: ZoomLevel
): number {
  const visibleRangeLength = getVisibleRangeLengthInDays(
    dayAssignments,
    visibleDates,
    assignmentId,
    date
  )
  const cellWidth = ZOOM_PIXEL_WIDTHS[zoomLevel]
  // Reserve space for priority indicator at end
  return visibleRangeLength * cellWidth - PRIORITY_INDICATOR_WIDTH
}

/**
 * Get the pixel offset from the start of the dates grid for a specific date
 */
export function getDatePixelOffset(
  visibleDates: Date[],
  targetDate: Date,
  zoomLevel: ZoomLevel
): number {
  const cellWidth = ZOOM_PIXEL_WIDTHS[zoomLevel]
  const dayIndex = visibleDates.findIndex(d => isSameDay(d, targetDate))
  if (dayIndex === -1) return 0
  return dayIndex * cellWidth
}

/**
 * Get the date from a click's clientX position relative to the timeline row
 */
export function getDateFromClickX(
  visibleDates: Date[],
  clientX: number,
  rowElement: HTMLElement,
  zoomLevel: ZoomLevel
): Date | null {
  const cellWidth = ZOOM_PIXEL_WIDTHS[zoomLevel]
  const rowRect = rowElement.getBoundingClientRect()
  const xInRow = clientX - rowRect.left - SIDEBAR_WIDTH
  if (xInRow < 0) return null
  const dayIndex = Math.floor(xInRow / cellWidth)
  if (dayIndex >= 0 && dayIndex < visibleDates.length) {
    return visibleDates[dayIndex]
  }
  return null
}

/**
 * Get the number of assignments for a member on a specific date
 */
export function getMemberAssignmentsOnDate(
  projectAssignments: any[],
  dayAssignments: any[],
  memberId: number,
  date: Date
): number {
  const memberAssignments = projectAssignments.filter(
    (pa: any) => pa.teamMemberId === memberId
  )

  return memberAssignments.filter((assignment: any) =>
    isDayAssigned(dayAssignments, assignment.id, date)
  ).length
}

/**
 * Get the number of members assigned to a project on a specific date
 */
export function getProjectMembersOnDate(
  projectAssignments: any[],
  dayAssignments: any[],
  projectId: number,
  date: Date
): number {
  const projAssignments = projectAssignments.filter(
    (pa: any) => pa.projectId === projectId
  )

  return projAssignments.filter((assignment: any) =>
    isDayAssigned(dayAssignments, assignment.id, date)
  ).length
}

/**
 * Check if a project has any assignments on a date (for collapsed view)
 */
export function projectHasAssignmentOnDate(
  projectAssignments: any[],
  dayAssignments: any[],
  projectId: number,
  date: Date
): boolean {
  return getProjectMembersOnDate(projectAssignments, dayAssignments, projectId, date) > 0
}

/**
 * Check if a member has any assignments on a date (for collapsed view)
 */
export function memberHasAssignmentOnDate(
  projectAssignments: any[],
  dayAssignments: any[],
  memberId: number,
  date: Date
): boolean {
  return getMemberAssignmentsOnDate(projectAssignments, dayAssignments, memberId, date) > 0
}

/**
 * Check if a project has assignments on the previous day
 */
export function projectHasAssignmentOnPrevDay(
  projectAssignments: any[],
  dayAssignments: any[],
  projectId: number,
  date: Date
): boolean {
  const prevDate = addDays(date, -1)
  return projectHasAssignmentOnDate(projectAssignments, dayAssignments, projectId, prevDate)
}

/**
 * Check if a project has assignments on the next day
 */
export function projectHasAssignmentOnNextDay(
  projectAssignments: any[],
  dayAssignments: any[],
  projectId: number,
  date: Date
): boolean {
  const nextDate = addDays(date, 1)
  return projectHasAssignmentOnDate(projectAssignments, dayAssignments, projectId, nextDate)
}

/**
 * Check if a member has assignments on the previous day
 */
export function memberHasAssignmentOnPrevDay(
  projectAssignments: any[],
  dayAssignments: any[],
  memberId: number,
  date: Date
): boolean {
  const prevDate = addDays(date, -1)
  return memberHasAssignmentOnDate(projectAssignments, dayAssignments, memberId, prevDate)
}

/**
 * Check if a member has assignments on the next day
 */
export function memberHasAssignmentOnNextDay(
  projectAssignments: any[],
  dayAssignments: any[],
  memberId: number,
  date: Date
): boolean {
  const nextDate = addDays(date, 1)
  return memberHasAssignmentOnDate(projectAssignments, dayAssignments, memberId, nextDate)
}

/**
 * Check if an assignment has any day assignments within a date range
 * Used for filtering empty rows in timeline
 */
export function hasAssignmentInDateRange(
  dayAssignments: any[],
  assignmentId: number,
  dates: Date[]
): boolean {
  return dates.some(date => isDayAssigned(dayAssignments, assignmentId, date))
}

/**
 * Check if two date strings are consecutive days
 */
export function isConsecutiveDay(date1Str: string, date2Str: string): boolean {
  const date1 = new Date(date1Str)
  const date2 = new Date(date2Str)
  const diffMs = date2.getTime() - date1.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return Math.abs(diffDays) === 1
}

/**
 * Add days to a date string (YYYY-MM-DD format)
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const date = new Date(dateStr)
  const result = addDays(date, days)
  return format(result, 'yyyy-MM-dd')
}

/**
 * Find overlapping day assignments in a date range
 * Excludes the specified project assignment ID (the one being moved)
 */
export function findOverlapsInRange(
  dayAssignments: any[],
  startDateStr: string,
  endDateStr: string,
  excludeAssignmentId: number,
  projectId: number,
  teamMemberId: number
): any[] {
  const start = new Date(startDateStr)
  const end = new Date(endDateStr)

  return dayAssignments.filter((da: any) => {
    // Skip the assignment being moved
    if (da.projectAssignmentId === excludeAssignmentId) return false

    // Only check for same project + member combination
    if (
      da.projectAssignment?.projectId !== projectId ||
      da.projectAssignment?.teamMemberId !== teamMemberId
    ) {
      return false
    }

    // Check if date is in range
    const daDate = new Date(da.date)
    return daDate >= start && daDate <= end
  })
}
