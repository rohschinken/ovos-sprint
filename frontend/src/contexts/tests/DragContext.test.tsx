import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { DragProvider, useDragContext } from '../DragContext'
import { useEffect, ReactNode } from 'react'

function wrapper({ children }: { children: ReactNode }) {
  return <DragProvider>{children}</DragProvider>
}

describe('DragContext', () => {
  it('context value object maintains referential identity across drag state changes', () => {
    const { result } = renderHook(() => {
      const ctx = useDragContext()
      return ctx
    }, { wrapper })

    const firstValue = result.current

    // Trigger a drag state change
    act(() => {
      result.current.setDragState({
        assignmentId: 1,
        startDate: new Date(),
        endDate: new Date(),
        mode: 'create',
      })
    })

    // The context value reference should be the same object
    expect(result.current.getDragState).toBe(firstValue.getDragState)
    expect(result.current.setDragState).toBe(firstValue.setDragState)
    expect(result.current.isDayInDragRange).toBe(firstValue.isDayInDragRange)
    expect(result.current.subscribe).toBe(firstValue.subscribe)
  })

  it('notifies subscribers on drag state changes without re-rendering provider', () => {
    const subscriberFn = vi.fn()

    const { result } = renderHook(() => {
      const ctx = useDragContext()
      // Subscribe on first render
      useEffect(() => {
        return ctx.subscribe(subscriberFn)
      }, [ctx])
      return ctx
    }, { wrapper })

    // Trigger drag state change
    act(() => {
      result.current.setDragState({
        assignmentId: 1,
        startDate: new Date(),
        endDate: new Date(),
        mode: 'create',
      })
    })

    // Subscriber should have been called
    expect(subscriberFn).toHaveBeenCalled()
  })

  it('getDragState returns updated state after setDragState', () => {
    const { result } = renderHook(() => useDragContext(), { wrapper })

    act(() => {
      result.current.setDragState({
        assignmentId: 42,
        startDate: new Date(2026, 3, 14),
        endDate: new Date(2026, 3, 15),
        mode: 'delete',
      })
    })

    const state = result.current.getDragState()
    expect(state.assignmentId).toBe(42)
    expect(state.mode).toBe('delete')
  })
})
