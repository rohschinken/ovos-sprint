import { describe, it, expect } from 'vitest'
import { milestoneSchema, dayOffSchema } from '../utils/validation.js'

describe('milestoneSchema', () => {
  it('accepts valid input', () => {
    const result = milestoneSchema.safeParse({
      projectId: 1,
      date: '2026-04-15',
      name: 'Sprint Review',
    })
    expect(result.success).toBe(true)
  })

  it('accepts input without optional name', () => {
    const result = milestoneSchema.safeParse({
      projectId: 1,
      date: '2026-04-15',
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-integer projectId', () => {
    const result = milestoneSchema.safeParse({
      projectId: 1.5,
      date: '2026-04-15',
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-positive projectId', () => {
    const result = milestoneSchema.safeParse({
      projectId: 0,
      date: '2026-04-15',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid date format', () => {
    const result = milestoneSchema.safeParse({
      projectId: 1,
      date: '04/15/2026',
    })
    expect(result.success).toBe(false)
  })

  it('rejects string projectId', () => {
    const result = milestoneSchema.safeParse({
      projectId: 'abc',
      date: '2026-04-15',
    })
    expect(result.success).toBe(false)
  })
})

describe('dayOffSchema', () => {
  it('accepts valid input', () => {
    const result = dayOffSchema.safeParse({
      teamMemberId: 1,
      date: '2026-04-15',
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-integer teamMemberId', () => {
    const result = dayOffSchema.safeParse({
      teamMemberId: 1.5,
      date: '2026-04-15',
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-positive teamMemberId', () => {
    const result = dayOffSchema.safeParse({
      teamMemberId: -1,
      date: '2026-04-15',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid date format', () => {
    const result = dayOffSchema.safeParse({
      teamMemberId: 1,
      date: 'not-a-date',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing teamMemberId', () => {
    const result = dayOffSchema.safeParse({
      date: '2026-04-15',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing date', () => {
    const result = dayOffSchema.safeParse({
      teamMemberId: 1,
    })
    expect(result.success).toBe(false)
  })
})
