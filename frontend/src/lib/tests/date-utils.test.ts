import { describe, it, expect } from 'vitest'
import { formatDate } from '../utils'
import {
  isSameDay,
  isWeekend,
  addDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
} from 'date-fns'

describe('Date Utilities', () => {
  describe('formatDate', () => {
    it('formats dates in German locale', () => {
      const date = new Date('2026-01-19')
      const formatted = formatDate(date)
      expect(formatted).toBe('19.01.2026')
    })

    it('handles different months correctly', () => {
      const dates = [
        { input: new Date('2026-01-01'), expected: '01.01.2026' },
        { input: new Date('2026-02-15'), expected: '15.02.2026' },
        { input: new Date('2026-12-31'), expected: '31.12.2026' },
      ]

      dates.forEach(({ input, expected }) => {
        expect(formatDate(input)).toBe(expected)
      })
    })

    it('pads single digit days and months with zero', () => {
      const date = new Date('2026-03-05')
      expect(formatDate(date)).toBe('05.03.2026')
    })
  })

  describe('date-fns utilities', () => {
    describe('isSameDay', () => {
      it('returns true for same day', () => {
        const date1 = new Date('2026-01-19T10:00:00')
        const date2 = new Date('2026-01-19T15:00:00')
        expect(isSameDay(date1, date2)).toBe(true)
      })

      it('returns false for different days', () => {
        const date1 = new Date('2026-01-19')
        const date2 = new Date('2026-01-20')
        expect(isSameDay(date1, date2)).toBe(false)
      })
    })

    describe('isWeekend', () => {
      it('returns true for Saturday', () => {
        const saturday = new Date('2026-01-17') // Saturday
        expect(isWeekend(saturday)).toBe(true)
      })

      it('returns true for Sunday', () => {
        const sunday = new Date('2026-01-18') // Sunday
        expect(isWeekend(sunday)).toBe(true)
      })

      it('returns false for weekdays', () => {
        const monday = new Date('2026-01-19') // Monday
        expect(isWeekend(monday)).toBe(false)
      })
    })

    describe('addDays', () => {
      it('adds days correctly', () => {
        const date = new Date('2026-01-19')
        const result = addDays(date, 5)
        expect(formatDate(result)).toBe('24.01.2026')
      })

      it('handles month boundaries', () => {
        const date = new Date('2026-01-30')
        const result = addDays(date, 2)
        expect(formatDate(result)).toBe('01.02.2026')
      })

      it('handles negative days (subtract)', () => {
        const date = new Date('2026-01-19')
        const result = addDays(date, -5)
        expect(formatDate(result)).toBe('14.01.2026')
      })
    })

    describe('week utilities', () => {
      it('gets start of week (Monday)', () => {
        const wednesday = new Date('2026-01-21')
        const start = startOfWeek(wednesday, { weekStartsOn: 1 })
        expect(formatDate(start)).toBe('19.01.2026')
      })

      it('gets end of week (Sunday)', () => {
        const wednesday = new Date('2026-01-21')
        const end = endOfWeek(wednesday, { weekStartsOn: 1 })
        expect(formatDate(end)).toBe('25.01.2026')
      })
    })

    describe('eachDayOfInterval', () => {
      it('generates array of dates for interval', () => {
        const start = new Date('2026-01-19')
        const end = new Date('2026-01-23')
        const days = eachDayOfInterval({ start, end })

        expect(days).toHaveLength(5)
        expect(formatDate(days[0])).toBe('19.01.2026')
        expect(formatDate(days[4])).toBe('23.01.2026')
      })

      it('handles single day interval', () => {
        const date = new Date('2026-01-19')
        const days = eachDayOfInterval({ start: date, end: date })

        expect(days).toHaveLength(1)
        expect(formatDate(days[0])).toBe('19.01.2026')
      })
    })
  })
})
