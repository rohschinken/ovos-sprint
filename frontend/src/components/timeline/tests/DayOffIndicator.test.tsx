import { describe, it, expect } from 'vitest'
import { render, screen } from '@/tests/utils'
import { DayOffIndicator } from '../DayOffIndicator'
import type { DayOff } from '@/types'

describe('DayOffIndicator', () => {
  const mockDayOffs: DayOff[] = [
    {
      id: 1,
      teamMemberId: 1,
      date: '2026-01-20',
      createdAt: '2026-01-10T00:00:00Z',
    },
  ]

  it('renders vacation indicator when member has day off', () => {
    render(
      <DayOffIndicator
        memberId={1}
        date={new Date('2026-01-20')}
        dayOffs={mockDayOffs}
      />
    )
    expect(screen.getByText(/vac\. 🏝️/)).toBeInTheDocument()
  })

  it('renders nothing when member has no day off', () => {
    const { container } = render(
      <DayOffIndicator
        memberId={1}
        date={new Date('2026-01-21')}
        dayOffs={mockDayOffs}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when different member', () => {
    const { container } = render(
      <DayOffIndicator
        memberId={2}
        date={new Date('2026-01-20')}
        dayOffs={mockDayOffs}
      />
    )
    expect(container.firstChild).toBeNull()
  })
})
