import { cn } from '@/lib/utils'
import {
  getAssignmentRoundedClass,
  getAssignmentBorderClass,
  getAssignmentWidthClass,
} from '@/lib/timeline-styling'
import {
  isPrevDayAssigned,
  isNextDayAssigned,
  isLastDayOfRange,
  isDayAssigned,
} from '@/lib/timeline-helpers'
import type { ExpandedAssignmentBarProps } from './types'

/**
 * ExpandedAssignmentBar Component
 *
 * Renders a detailed assignment bar with priority indicators in expanded view.
 * Shows individual assignment bars with rounded corners, borders, and priority emojis.
 *
 * Priority indicators appear on the last day of each assignment range:
 * - High priority: 🔥
 * - Low priority: ❄️
 * - Normal priority: (no indicator)
 *
 * Color logic:
 * - Orange if overlap detected
 * - Green otherwise
 * - Reduced opacity for tentative projects
 * - Faded during drag operations
 *
 * @param assignmentId - The ID of the project assignment
 * @param date - The date to render the bar for
 * @param projectAssignments - All project assignments
 * @param dayAssignments - All day assignments
 * @param project - The project this assignment belongs to
 * @param member - The member this assignment belongs to (for overlap calculation)
 * @param isDayInDragRange - Whether this day is being dragged
 * @param isAdmin - Whether the user is an admin
 * @param hasOverlap - Whether there's an overlap on this date
 * @param onMouseDown - Mouse down handler for drag operations
 * @param onClick - Click handler for editing
 * @param onContextMenu - Right-click handler for deletion
 * @param getGroupPriority - Function to get priority for a specific date
 */
export function ExpandedAssignmentBar({
  assignmentId,
  date,
  projectAssignments: _projectAssignments,
  dayAssignments,
  project,
  member: _member,
  isDayInDragRange,
  isAdmin,
  hasOverlap,
  onMouseDown,
  onClick,
  onContextMenu,
  getGroupPriority,
}: ExpandedAssignmentBarProps) {
  // Check if this day is assigned
  const isAssigned = isDayAssigned(dayAssignments, assignmentId, date)

  if (!isAssigned && !isDayInDragRange) {
    return null
  }

  // Check adjacent days for styling
  const hasPrevDay = isPrevDayAssigned(dayAssignments, assignmentId, date)
  const hasNextDay = isNextDayAssigned(dayAssignments, assignmentId, date)
  const isLastDay = isLastDayOfRange(dayAssignments, assignmentId, date)

  // Get priority for this date
  const priority = isAssigned ? getGroupPriority(assignmentId, date) : 'normal'

  // Determine color based on overlap
  const colorClasses = hasOverlap
    ? 'bg-orange-500/40 border-orange-400'
    : 'bg-confirmed border-emerald-400'

  return (
    <div
      className={cn(
        'h-5 shadow-sm relative z-20',
        getAssignmentWidthClass(hasNextDay),
        getAssignmentRoundedClass(hasPrevDay, hasNextDay),
        getAssignmentBorderClass(hasPrevDay, hasNextDay),
        colorClasses,
        project.status === 'tentative' && !hasOverlap && 'opacity-60',
        isDayInDragRange && 'opacity-50',
        isAdmin && 'cursor-pointer'
      )}
      onMouseDown={onMouseDown}
      onClick={onClick}
      onContextMenu={onContextMenu}
      style={{ pointerEvents: 'auto' }}
    >
      {/* Priority indicators - only show on last day of range */}
      {isAssigned && isLastDay && (
        <>
          {priority === 'high' && (
            <span className="absolute top-1/2 -translate-y-1/2 right-0 text-[9px] leading-none z-30 pointer-events-none">
              🔥
            </span>
          )}
          {priority === 'low' && (
            <span className="absolute top-1/2 -translate-y-1/2 right-0 text-[9px] leading-none z-30 pointer-events-none">
              ❄️
            </span>
          )}
        </>
      )}
    </div>
  )
}
