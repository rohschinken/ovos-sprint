import { describe, it, expect } from 'vitest'
import { isDayAssigned, isPrevDayAssigned, isNextDayAssigned } from '../timeline-helpers'

const mockDayAssignments = [
  { id: 1, projectAssignment: { id: 10 }, date: '2026-04-14' },
  { id: 2, projectAssignment: { id: 10 }, date: '2026-04-15' },
  { id: 3, projectAssignment: { id: 20 }, date: '2026-04-14' },
]

describe('isDayAssigned (string comparison optimization)', () => {
  it('returns true when assignment exists on date', () => {
    const date = new Date(2026, 3, 14) // April 14, 2026
    expect(isDayAssigned(mockDayAssignments, 10, date)).toBe(true)
  })

  it('returns false when assignment does not exist on date', () => {
    const date = new Date(2026, 3, 16) // April 16, 2026
    expect(isDayAssigned(mockDayAssignments, 10, date)).toBe(false)
  })

  it('returns false for wrong assignment id', () => {
    const date = new Date(2026, 3, 14)
    expect(isDayAssigned(mockDayAssignments, 99, date)).toBe(false)
  })

  it('distinguishes between different assignments on same date', () => {
    const date = new Date(2026, 3, 14)
    expect(isDayAssigned(mockDayAssignments, 10, date)).toBe(true)
    expect(isDayAssigned(mockDayAssignments, 20, date)).toBe(true)
    expect(isDayAssigned(mockDayAssignments, 30, date)).toBe(false)
  })

  it('works with isPrevDayAssigned', () => {
    const date = new Date(2026, 3, 15) // has prev day (14th)
    expect(isPrevDayAssigned(mockDayAssignments, 10, date)).toBe(true)

    const date2 = new Date(2026, 3, 14) // no prev day (13th)
    expect(isPrevDayAssigned(mockDayAssignments, 10, date2)).toBe(false)
  })

  it('works with isNextDayAssigned', () => {
    const date = new Date(2026, 3, 14) // has next day (15th)
    expect(isNextDayAssigned(mockDayAssignments, 10, date)).toBe(true)

    const date2 = new Date(2026, 3, 15) // no next day (16th)
    expect(isNextDayAssigned(mockDayAssignments, 10, date2)).toBe(false)
  })

  it('handles empty dayAssignments array', () => {
    const date = new Date(2026, 3, 14)
    expect(isDayAssigned([], 10, date)).toBe(false)
  })

  it('handles dayAssignments without projectAssignment', () => {
    const broken = [{ id: 1, date: '2026-04-14' }] // no projectAssignment
    const date = new Date(2026, 3, 14)
    expect(isDayAssigned(broken, 10, date)).toBe(false)
  })
})
