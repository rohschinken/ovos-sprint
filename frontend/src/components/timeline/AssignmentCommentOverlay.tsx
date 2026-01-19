import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  isDayAssigned,
  isFirstDayOfRange,
  getDatePixelOffset,
  getCommentOverlayWidth,
  getDateFromClickX,
} from '@/lib/timeline-helpers'
import type { AssignmentGroup } from '@/types'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { AssignmentCommentOverlayProps, ZoomLevel } from './types'

/**
 * AssignmentCommentOverlay Component
 *
 * Renders comment overlays on assignment rows that span across contiguous date ranges.
 * This component displays the 💬 emoji and truncated comment text over assignment bars,
 * positioned absolutely across the full width of the contiguous range.
 *
 * Features:
 * - Finds all contiguous ranges with comments for the assignment
 * - Positions using absolute positioning with left offset based on date
 * - Width calculated using getCommentOverlayWidth to reserve space for priority indicator
 * - Includes Tooltip showing full comment on hover
 * - Click handler to find actual date clicked and call onCommentClick
 * - Context menu handler for delete operations
 *
 * @param assignmentId - The ID of the assignment
 * @param dates - Array of visible dates in the timeline
 * @param dayAssignments - Array of all day assignments
 * @param assignmentGroups - Array of assignment groups with comments and priorities
 * @param zoomLevel - Current zoom level (1-4)
 * @param onCommentClick - Callback when comment is clicked
 * @param onCommentContextMenu - Callback when comment is right-clicked
 */
export function AssignmentCommentOverlay({
  assignmentId,
  dates,
  dayAssignments,
  assignmentGroups,
  zoomLevel,
  onCommentClick,
  onCommentContextMenu,
}: AssignmentCommentOverlayProps) {
  /**
   * Get the assignment group for a specific date
   */
  const getGroupForDate = (assignmentId: number, date: Date): AssignmentGroup | null => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return (
      assignmentGroups.find(
        (g) =>
          g.projectAssignmentId === assignmentId &&
          dateStr >= g.startDate &&
          dateStr <= g.endDate
      ) ?? null
    )
  }

  /**
   * Get the comment for a specific date within an assignment
   */
  const getGroupComment = (assignmentId: number, date: Date): string | null => {
    const group = getGroupForDate(assignmentId, date)
    return group?.comment ?? null
  }

  /**
   * Get the priority for a specific date within an assignment
   */
  const getGroupPriority = (assignmentId: number, date: Date): 'high' | 'normal' | 'low' => {
    const group = getGroupForDate(assignmentId, date)
    return group?.priority ?? 'normal'
  }

  // Find all contiguous ranges with comments for this assignment
  const commentRanges: { date: Date; comment: string }[] = []
  dates.forEach((date) => {
    if (
      isDayAssigned(dayAssignments, assignmentId, date) &&
      isFirstDayOfRange(dayAssignments, assignmentId, date)
    ) {
      const comment = getGroupComment(assignmentId, date)
      if (comment) {
        commentRanges.push({ date, comment })
      }
    }
  })

  if (commentRanges.length === 0) {
    return null
  }

  return (
    <>
      {commentRanges.map(({ date, comment }) => (
        <Tooltip key={`comment-${date.toISOString()}`}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'absolute top-1/2 -translate-y-1/2',
                'flex items-center gap-0.5',
                'text-[9px] leading-none',
                'pointer-events-auto cursor-pointer overflow-hidden',
                'z-20'
              )}
              style={{
                left: 256 + getDatePixelOffset(dates, date, zoomLevel as ZoomLevel) + 4, // 256px = w-64 sidebar, +4 for padding
                width: getCommentOverlayWidth(
                  dayAssignments,
                  dates,
                  assignmentId,
                  date,
                  zoomLevel as ZoomLevel
                ),
              }}
              onClick={(e) => {
                // Find the actual date clicked based on X position
                const row = e.currentTarget.closest('.relative') as HTMLElement
                if (row) {
                  const clickedDate = getDateFromClickX(
                    dates,
                    e.clientX,
                    row,
                    zoomLevel as ZoomLevel
                  )
                  if (clickedDate && isDayAssigned(dayAssignments, assignmentId, clickedDate)) {
                    onCommentClick(assignmentId, clickedDate, e)
                  }
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                // Find the actual date clicked based on X position
                const row = e.currentTarget.closest('.relative') as HTMLElement
                if (row) {
                  const clickedDate = getDateFromClickX(
                    dates,
                    e.clientX,
                    row,
                    zoomLevel as ZoomLevel
                  )
                  if (clickedDate && isDayAssigned(dayAssignments, assignmentId, clickedDate)) {
                    onCommentContextMenu(assignmentId, clickedDate, e)
                  }
                }
              }}
            >
              <span className="flex-shrink-0">💬</span>
              <span className="truncate text-foreground/70 font-medium">{comment}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">💬 {comment}</p>
            {getGroupPriority(assignmentId, date) === 'high' && (
              <p className="max-w-xs">🔥 high priority</p>
            )}
            {getGroupPriority(assignmentId, date) === 'low' && (
              <p className="max-w-xs">🤷‍♂️ low priority</p>
            )}
          </TooltipContent>
        </Tooltip>
      ))}
    </>
  )
}
