import { useState } from 'react'

/**
 * Warning state interface for timeline warnings
 */
export interface TimelineWarning {
  type: 'holiday' | 'non-working-day'
  message: string | React.ReactNode
  onConfirm: () => void
}

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
