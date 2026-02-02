import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { getDatePixelOffset } from '@/lib/timeline-helpers'
import {
  getAssignmentRoundedClass,
} from '@/lib/timeline-styling'
import { ZOOM_PIXEL_WIDTHS, SIDEBAR_WIDTH } from '@/lib/timeline-constants'
import type { ZoomLevel } from './types'

/**
 * DeleteDragOverlay Component
 *
 * Renders red overlay bars during delete drag operations to provide visual feedback.
 * Shows which assignments will be deleted when the mouse button is released.
 *
 * Features:
 * - Only renders when drag mode is 'delete'
 * - Shows red semi-transparent bars over assigned cells in drag range
 * - Seamless multi-day visual with rounded corners at edges
 * - Matches assignment bar positioning and sizing
 * - Doesn't interfere with drag interactions (pointer-events-none)
 *
 * @param assignmentId - The ID of the assignment being dragged
 * @param dates - Array of visible dates in the timeline
 * @param dayAssignments - Array of all day assignments
 * @param isDayInDragRange - Function to check if date is in drag range
 * @param getDragMode - Function to get current drag mode
 * @param zoomLevel - Current zoom level for pixel width calculations
 */
interface DeleteDragOverlayProps {
  assignmentId: number
  dates: Date[]
  isDayInDragRange: (assignmentId: number, date: Date) => boolean
  getDragMode: () => 'create' | 'delete' | 'move' | null
  zoomLevel: number
}

export function DeleteDragOverlay({
  assignmentId,
  dates,
  isDayInDragRange,
  getDragMode,
  zoomLevel,
}: DeleteDragOverlayProps) {
  // Only render if in delete mode
  const mode = getDragMode()
  if (mode !== 'delete') {
    return null
  }

  // Pre-compute which dates should show overlays
  const overlayDates = useMemo(() => {
    return dates.filter((date) => {
      // Show overlay on ALL cells in drag range (assigned or not)
      return isDayInDragRange(assignmentId, date)
    })
  }, [dates, assignmentId, isDayInDragRange])

  const cellWidth = ZOOM_PIXEL_WIDTHS[zoomLevel as ZoomLevel]

  return (
    <>
      {overlayDates.map((date, index) => {
        // Check if adjacent dates are also in drag range for seamless styling
        const prevDate = index > 0 ? overlayDates[index - 1] : null
        const nextDate = index < overlayDates.length - 1 ? overlayDates[index + 1] : null

        const hasPrevDay = !!(prevDate && Math.abs(prevDate.getTime() - date.getTime()) === 86400000) // 1 day in ms
        const hasNextDay = !!(nextDate && Math.abs(nextDate.getTime() - date.getTime()) === 86400000)

        // Calculate pixel-based positioning
        const leftOffset = SIDEBAR_WIDTH + getDatePixelOffset(dates, date, zoomLevel as ZoomLevel)
        const width = hasNextDay ? cellWidth + 1 : cellWidth // +1 to overlap borders for seamless look

        return (
          <div
            key={date.toISOString()}
            className={cn(
              // Position and size - vertically centered like assignment bars
              'absolute top-1/2 -translate-y-1/2',
              'h-5', // Match assignment bar height
              // Styling
              getAssignmentRoundedClass(hasPrevDay, hasNextDay),
              'border-2 border-destructive',
              'bg-destructive/30', // 30% opacity to match bars during delete
              // Z-index and interactions
              'z-30', // Above assignment bars (z-20)
              'pointer-events-none', // Don't interfere with drag
              // Smooth transition
              'transition-all duration-150'
            )}
            style={{
              left: `${leftOffset}px`,
              width: `${width}px`,
            }}
          />
        )
      })}
    </>
  )
}
