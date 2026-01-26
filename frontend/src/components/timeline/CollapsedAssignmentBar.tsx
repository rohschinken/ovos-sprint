import { cn } from '@/lib/utils'
import {
  getCollapsedBarRoundedClass,
  getCollapsedBarBorderClass,
  getCollapsedBarWidthClass,
} from '@/lib/timeline-styling'
import {
  projectHasAssignmentOnDate,
  projectHasAssignmentOnPrevDay,
  projectHasAssignmentOnNextDay,
  memberHasAssignmentOnDate,
  memberHasAssignmentOnPrevDay,
  memberHasAssignmentOnNextDay,
} from '@/lib/timeline-helpers'
import type { CollapsedAssignmentBarProps } from './types'

/**
 * CollapsedAssignmentBar Component
 *
 * Renders a compact assignment bar in collapsed view (when row is not expanded).
 * Shows a single consolidated bar indicating that assignments exist on this date.
 *
 * In project view: Always green with opacity for tentative projects
 * In member view: Orange if overlap detected, otherwise green
 *
 * @param type - Whether this is for a project or member row
 * @param id - The project or member ID
 * @param date - The date to render the bar for
 * @param projectAssignments - All project assignments
 * @param dayAssignments - All day assignments
 * @param projects - Array of projects (only needed for member view)
 * @param isTentative - Whether the project is tentative (only for project view)
 * @param hasOverlap - Whether there's an overlap on this date
 * @param showOverlaps - Whether to show overlap visualization
 */
export function CollapsedAssignmentBar({
  type,
  id,
  date,
  projectAssignments,
  dayAssignments,
  projects: _projects = [],
  isTentative = false,
  hasOverlap,
  showOverlaps,
  memberId,
  isNonWorkingDay,
  isHoliday,
}: CollapsedAssignmentBarProps) {
  // Check if there's an assignment on this date
  const hasAssignment = type === 'project'
    ? projectHasAssignmentOnDate(projectAssignments, dayAssignments, id, date)
    : memberHasAssignmentOnDate(projectAssignments, dayAssignments, id, date)

  if (!hasAssignment) {
    return null
  }

  // Check adjacent days for styling
  const hasPrevDay = type === 'project'
    ? projectHasAssignmentOnPrevDay(projectAssignments, dayAssignments, id, date)
    : memberHasAssignmentOnPrevDay(projectAssignments, dayAssignments, id, date)

  const hasNextDay = type === 'project'
    ? projectHasAssignmentOnNextDay(projectAssignments, dayAssignments, id, date)
    : memberHasAssignmentOnNextDay(projectAssignments, dayAssignments, id, date)

  // Check if this date is a non-working day (member view only)
  const isOnNonWorkingDay = type === 'member' && memberId && (
    isHoliday?.(date) ||
    isNonWorkingDay?.(memberId, date)
  )

  // Determine color based on type and overlap
  const isOverlap = showOverlaps && hasOverlap
  const colorClasses = isOverlap
    ? 'bg-orange-500/40 border-orange-400'
    : 'bg-confirmed border-emerald-400'

  // Dynamic height and border classes based on non-working day
  const heightClasses = isOnNonWorkingDay
    ? 'h-0 border-t-[2px]' // Thin line: zero height + 2px top border
    : 'h-3' // Normal collapsed height (12px)

  const borderClasses = isOnNonWorkingDay
    ? 'border-t-[2px]' // Only top border for thin line
    : getCollapsedBarBorderClass(hasPrevDay, hasNextDay) // Full borders

  return (
    <div
      className={cn(
        heightClasses, // CHANGED from static 'h-3'
        'shadow-sm',
        getCollapsedBarWidthClass(hasNextDay),
        getCollapsedBarRoundedClass(hasPrevDay, hasNextDay),
        borderClasses, // CHANGED from getCollapsedBarBorderClass()
        colorClasses,
        // Apply opacity for tentative projects (only in project view)
        type === 'project' && isTentative && 'opacity-60'
      )}
    />
  )
}
