import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { AssignmentPriority } from '@/types'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { cn } from '@/lib/utils'
import type { AssignmentEditPopoverProps } from './types'

export function AssignmentEditPopover({
  open,
  onOpenChange,
  position,
  group,
  dateRange,
  onSave,
}: AssignmentEditPopoverProps) {
  const [priority, setPriority] = useState<AssignmentPriority>(group?.priority ?? 'normal')
  const [comment, setComment] = useState(group?.comment ?? '')
  const popoverRef = useRef<HTMLDivElement>(null)

  // Reset form when group or date range changes
  useEffect(() => {
    setPriority(group?.priority ?? 'normal')
    setComment(group?.comment ?? '')
  }, [group, dateRange.start, dateRange.end])

  // Track if we should ignore the next outside click (for Select dropdown interactions)
  const ignoreNextClickRef = useRef(false)

  // Handle click outside to close
  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      // Skip if we're ignoring this click
      if (ignoreNextClickRef.current) {
        ignoreNextClickRef.current = false
        return
      }

      const target = e.target as Element

      // Check if click is inside our popover
      if (popoverRef.current && popoverRef.current.contains(target)) {
        return
      }

      // Check if click is inside a Radix portal (Select dropdown, etc.)
      const isRadixPortal = target.closest?.(
        '[data-radix-popper-content-wrapper], [data-radix-select-content], [role="listbox"], [role="option"]'
      )
      if (isRadixPortal) {
        return
      }

      onOpenChange(false)
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false)
      }
    }

    // Use capture phase to catch events before they bubble
    // Small delay to avoid closing from the opening click
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, true)
      document.addEventListener('keydown', handleEscape)
    }, 10)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside, true)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, onOpenChange])

  if (!open) return null

  const handleSave = () => {
    onSave({
      priority,
      comment: comment.trim() || null,
    })
  }

  // Calculate position to keep popover in viewport
  const calculatePosition = () => {
    const popoverWidth = 280
    const popoverHeight = 220
    const padding = 16

    let x = position.x
    let y = position.y + 10 // Offset below click point

    // Adjust if too close to right edge
    if (x + popoverWidth > window.innerWidth - padding) {
      x = window.innerWidth - popoverWidth - padding
    }

    // Adjust if too close to left edge
    if (x < padding) {
      x = padding
    }

    // Adjust if too close to bottom edge
    if (y + popoverHeight > window.innerHeight - padding) {
      y = position.y - popoverHeight - 10 // Show above click point instead
    }

    return { x, y }
  }

  const pos = calculatePosition()

  // Format date range for display
  const formatDateRange = () => {
    if (dateRange.start === dateRange.end) {
      return dateRange.start
    }
    return `${dateRange.start} - ${dateRange.end}`
  }

  return createPortal(
    <div
      ref={popoverRef}
      className={cn(
        'fixed z-50 w-[280px] rounded-md border bg-popover p-4 text-popover-foreground shadow-md',
        'animate-in fade-in-0 zoom-in-95'
      )}
      style={{
        left: pos.x,
        top: pos.y,
      }}
    >
      <div className="space-y-4">
        <div className="text-xs text-muted-foreground">
          {formatDateRange()}
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as AssignmentPriority)}>
            <SelectTrigger id="priority" className="h-9">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">
                <span className="flex items-center gap-2">
                  High
                </span>
              </SelectItem>
              <SelectItem value="normal">
                <span className="flex items-center gap-2">
                  Normal
                </span>
              </SelectItem>
              <SelectItem value="low">
                <span className="flex items-center gap-2">
                  Low
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="comment">Comment</Label>
          <Input
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a note..."
            className="h-9"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
