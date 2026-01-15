import { isSameDay } from 'date-fns'
import { DayOff } from '@/types'

/**
 * Props for DayOffIndicator component
 */
interface DayOffIndicatorProps {
  memberId: number
  date: Date
  dayOffs: DayOff[]
}

/**
 * DayOffIndicator Component
 *
 * Renders a vacation/day-off indicator on member rows in the timeline.
 * Displays "vac. 🏝️" text when a team member has a day off scheduled.
 * Used exclusively in the by-member view.
 *
 * @param memberId - The ID of the team member
 * @param date - The date to check for day-offs
 * @param dayOffs - Array of all day-off records
 */
export function DayOffIndicator({
  memberId,
  date,
  dayOffs,
}: DayOffIndicatorProps) {
  const hasDayOff = dayOffs.some(
    (dayOff) =>
      dayOff.teamMemberId === memberId &&
      isSameDay(new Date(dayOff.date), date)
  )

  if (!hasDayOff) {
    return null
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 text-[10px] text-dayOffText text-center font-medium pointer-events-none">
      vac. 🏝️
    </div>
  )
}
