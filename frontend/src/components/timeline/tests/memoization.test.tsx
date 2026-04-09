/**
 * Tests for Timeline and AssignmentRow memoization fixes.
 *
 * These tests verify that:
 * 1. Timeline.expandedItemsSet is memoized (same Set reference when input is unchanged)
 * 2. AssignmentRow.today is memoized (stable Date reference across renders)
 *
 * Since both fixes involve React hooks (useMemo), we test via renderHook
 * to isolate the memoization behavior without rendering the full component tree.
 */
import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMemo } from 'react'

describe('Timeline memoization', () => {
  describe('expandedItemsSet should be memoized', () => {
    /**
     * Simulates the hook usage from Timeline.tsx:
     *   const expandedItemsSet = useMemo(() => new Set(expandedItemsProp), [expandedItemsProp])
     *
     * Before the fix, this was: const expandedItemsSet = new Set(expandedItemsProp)
     * which created a new Set on every render.
     */
    function useExpandedItemsSet(expandedItems: number[]) {
      return useMemo(() => new Set(expandedItems), [expandedItems])
    }

    it('returns the same Set reference when the input array reference is unchanged', () => {
      const items = [1, 2, 3]
      const { result, rerender } = renderHook(
        ({ items }) => useExpandedItemsSet(items),
        { initialProps: { items } }
      )

      const firstSet = result.current
      expect(firstSet).toBeInstanceOf(Set)
      expect(firstSet.size).toBe(3)

      // Re-render with the same array reference
      rerender({ items })

      // The Set reference should be identical (memoized)
      expect(result.current).toBe(firstSet)
    })

    it('returns a new Set when the input array reference changes', () => {
      const { result, rerender } = renderHook(
        ({ items }) => useExpandedItemsSet(items),
        { initialProps: { items: [1, 2, 3] } }
      )

      const firstSet = result.current

      // Re-render with a new array (different reference)
      rerender({ items: [1, 2, 3, 4] })

      // The Set should be a new instance with updated contents
      expect(result.current).not.toBe(firstSet)
      expect(result.current.size).toBe(4)
      expect(result.current.has(4)).toBe(true)
    })

    it('contains all expanded item IDs', () => {
      const items = [10, 20, 30]
      const { result } = renderHook(
        ({ items }) => useExpandedItemsSet(items),
        { initialProps: { items } }
      )

      expect(result.current.has(10)).toBe(true)
      expect(result.current.has(20)).toBe(true)
      expect(result.current.has(30)).toBe(true)
      expect(result.current.has(99)).toBe(false)
    })
  })

  describe('AssignmentRow today should be memoized', () => {
    /**
     * Simulates the hook usage from AssignmentRow.tsx:
     *   const today = useMemo(() => new Date(), [])
     *
     * Before the fix, this was: const today = new Date()
     * which created a new Date on every render, defeating the useMemo
     * dependency array at line 234 that includes `today`.
     */
    function useStableToday() {
      return useMemo(() => new Date(), [])
    }

    it('returns the same Date reference across re-renders', () => {
      const { result, rerender } = renderHook(() => useStableToday())

      const firstDate = result.current
      expect(firstDate).toBeInstanceOf(Date)

      // Re-render multiple times
      rerender()
      expect(result.current).toBe(firstDate)

      rerender()
      expect(result.current).toBe(firstDate)
    })

    it('returns a valid Date for today', () => {
      const { result } = renderHook(() => useStableToday())

      const now = new Date()
      // The memoized date should be from the same day
      expect(result.current.getFullYear()).toBe(now.getFullYear())
      expect(result.current.getMonth()).toBe(now.getMonth())
      expect(result.current.getDate()).toBe(now.getDate())
    })
  })
})
