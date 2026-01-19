import { describe, it, expect } from 'vitest'
import { cn, getInitials, formatDate } from '../utils'

describe('Utility Functions', () => {
  describe('cn', () => {
    it('merges class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('handles conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
    })
  })

  describe('getInitials', () => {
    it('extracts initials from names', () => {
      expect(getInitials('John', 'Doe')).toBe('JD')
    })

    it('handles single name', () => {
      expect(getInitials('John', '')).toBe('J')
    })
  })

  describe('formatDate', () => {
    it('formats dates correctly (German locale)', () => {
      const date = new Date('2026-01-19')
      const formatted = formatDate(date)
      // German locale format: dd.MM.yyyy
      expect(formatted).toBe('19.01.2026')
    })
  })
})
