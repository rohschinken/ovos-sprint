import { isSameDay } from 'date-fns'
import { Milestone } from '@/types'

/**
 * Props for MilestoneIndicator component
 */
interface MilestoneIndicatorProps {
  projectId: number
  date: Date
  milestones: Milestone[]
  canEdit: boolean
  onToggle: (projectId: number, date: Date, e: React.MouseEvent) => void
}

/**
 * MilestoneIndicator Component
 *
 * Renders a milestone flag indicator (🚩) on project rows in the timeline.
 * Used in both by-project and by-member views to mark important project dates.
 *
 * @param projectId - The ID of the project
 * @param date - The date to check for milestones
 * @param milestones - Array of all milestones
 * @param canEdit - Whether the user can edit milestones
 * @param onToggle - Callback to toggle milestone on/off
 */
export function MilestoneIndicator({
  projectId,
  date,
  milestones,
  canEdit,
  onToggle,
}: MilestoneIndicatorProps) {
  const hasMilestone = milestones.some(
    (m: Milestone) =>
      m.projectId === projectId &&
      isSameDay(new Date(m.date), date)
  )

  if (!hasMilestone) {
    return null
  }

  const handleClick = (e: React.MouseEvent) => {
    if (!canEdit) return

    e.preventDefault()
    e.stopPropagation()
    onToggle(projectId, date, e)
  }

  return (
    <div
      className="absolute top-0 bottom-0 right-0 left-0 text-sm text-center font-medium pointer-events-none"
      onClick={canEdit ? handleClick : undefined}
      style={{ pointerEvents: canEdit ? 'auto' : 'none' }}
    >
      🚩
    </div>
  )
}
