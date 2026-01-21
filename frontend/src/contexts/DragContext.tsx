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
