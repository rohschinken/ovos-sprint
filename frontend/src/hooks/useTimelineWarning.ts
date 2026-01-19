import { useState } from 'react'
import type { TimelineWarning } from '@/components/timeline/types'

/**
 * Custom hook for managing timeline warning dialogs
 *
 * Handles warning state for holidays and non-working day assignments.
 * Provides a simple interface for setting and clearing warnings.
 *
 * @returns Object with warning state and setter functions
 */
export function useTimelineWarning() {
  const [timelineWarning, setTimelineWarning] = useState<TimelineWarning | null>(null)

  /**
   * Clear the current warning
   */
  const clearWarning = () => {
    setTimelineWarning(null)
  }

  return {
    timelineWarning,
    setTimelineWarning,
    clearWarning,
  }
}
