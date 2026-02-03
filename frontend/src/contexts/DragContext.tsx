import { createContext, useContext, useRef, useState, useCallback, ReactNode } from 'react'

/**
 * DragContext - Isolated drag state management
 *
 * This context prevents Timeline component from re-rendering on every drag state update.
 * Instead, only the cells that subscribe to drag updates will re-render.
 *
 * Key optimizations:
 * - Drag state stored in ref for instant updates without re-renders
 * - Only triggers re-render for cells in the drag range via subscribers
 * - Stable API (no new function references on every render)
 */

interface DragState {
  assignmentId: number | null
  startDate: Date | null
  endDate: Date | null
  mode: 'create' | 'delete' | 'move' | null
  moveSource?: { startDate: string; endDate: string } // Original range when moving
  moveOffset?: number // Number of days moved from original position
}

interface DragContextValue {
  // Get current drag state (from ref, doesn't cause re-render)
  getDragState: () => DragState
  // Set drag state (updates ref + notifies subscribers)
  setDragState: (state: DragState) => void
  // Check if a specific date is in the drag range (stable function)
  isDayInDragRange: (assignmentId: number, date: Date) => boolean
  // Subscribe to drag updates (for cells that need to show drag feedback)
  subscribe: (callback: () => void) => () => void
}

const DragContext = createContext<DragContextValue | undefined>(undefined)

interface DragProviderProps {
  children: ReactNode
}

export function DragProvider({ children }: DragProviderProps) {
  // Store drag state in a ref to avoid re-renders
  const dragStateRef = useRef<DragState>({
    assignmentId: null,
    startDate: null,
    endDate: null,
    mode: null,
  })

  // Subscribers that want to be notified of drag updates
  const subscribersRef = useRef<Set<() => void>>(new Set())

  // Force update for this component only (not children)
  const [, forceUpdate] = useState({})

  // Get current drag state (stable reference)
  const getDragState = useCallback(() => {
    return dragStateRef.current
  }, [])

  // Set drag state and notify subscribers
  const setDragState = useCallback((newState: DragState) => {
    dragStateRef.current = newState

    // Notify all subscribers (individual cells)
    subscribersRef.current.forEach(callback => callback())

    // Force update this component to trigger re-render of cells
    forceUpdate({})
  }, [])

  // Check if date is in drag range (stable reference)
  const isDayInDragRange = useCallback((assignmentId: number, date: Date): boolean => {
    const state = dragStateRef.current

    if (
      state.assignmentId !== assignmentId ||
      !state.startDate ||
      !state.endDate
    ) {
      return false
    }

    // For MOVE mode, calculate the target range based on offset
    // Don't show intermediate days, only show where the block will land
    if (state.mode === 'move' && state.moveSource && state.moveOffset !== undefined) {
      const originalStart = new Date(state.moveSource.startDate)
      const originalEnd = new Date(state.moveSource.endDate)

      // Apply offset to get new range
      const newStart = new Date(originalStart)
      newStart.setDate(newStart.getDate() + state.moveOffset)
      const newEnd = new Date(originalEnd)
      newEnd.setDate(newEnd.getDate() + state.moveOffset)

      // Normalize to ensure start <= end
      const start = newStart < newEnd ? newStart : newEnd
      const end = newStart > newEnd ? newStart : newEnd

      return date >= start && date <= end
    }

    // For CREATE and DELETE modes, use the current drag range
    const start =
      state.startDate < state.endDate
        ? state.startDate
        : state.endDate
    const end =
      state.startDate > state.endDate
        ? state.startDate
        : state.endDate

    return date >= start && date <= end
  }, [])

  // Subscribe to drag updates
  const subscribe = useCallback((callback: () => void) => {
    subscribersRef.current.add(callback)

    // Return unsubscribe function
    return () => {
      subscribersRef.current.delete(callback)
    }
  }, [])

  const value: DragContextValue = {
    getDragState,
    setDragState,
    isDayInDragRange,
    subscribe,
  }

  return <DragContext.Provider value={value}>{children}</DragContext.Provider>
}

export function useDragContext() {
  const context = useContext(DragContext)
  if (!context) {
    throw new Error('useDragContext must be used within a DragProvider')
  }
  return context
}
