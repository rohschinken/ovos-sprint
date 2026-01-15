import { format, isFirstDayOfMonth, getDay } from 'date-fns'
import { ChevronDown, ChevronRight, Clock } from 'lucide-react'
import { cn, getInitials, getAvatarColor } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { isWeekend, isHoliday } from '@/lib/holidays'
import { MilestoneIndicator } from './MilestoneIndicator'
import type { Project, TeamMember, Milestone } from '@/types'

/**
 * Props for TimelineItemHeader component
 */
interface TimelineItemHeaderProps {
  type: 'project' | 'member'
  item: Project | TeamMember
  isExpanded: boolean
  canEdit: boolean
  onToggleExpand: (id: number) => void
  dates: Date[]
  columnWidth: string
  // Only for projects:
  milestones?: Milestone[]
  onMilestoneToggle?: (projectId: number, date: Date, event: React.MouseEvent) => void
}

/**
 * TimelineItemHeader Component
 *
 * Renders the header row for each project or member with expand/collapse functionality.
 * This component displays:
 * - Expand/collapse button with chevron icons
 * - Avatar with initials and color (for members) or project info (for projects)
 * - Name and details (status badges for projects, role badges for members)
 * - Date cells for milestone indicators (only for project type)
 *
 * Features:
 * - Two types: 'project' and 'member' with different layouts
 * - Color-coded status badges for projects (confirmed/tentative)
 * - Color-coded role badges for members (admin/project_manager/user)
 * - Milestone indicators in date cells for projects
 * - Collapsible/expandable with visual feedback
 *
 * @param type - The type of item ('project' or 'member')
 * @param item - The project or team member data
 * @param isExpanded - Whether the item is currently expanded
 * @param canEdit - Whether the user can edit this item
 * @param onToggleExpand - Callback to toggle expand/collapse
 * @param dates - Array of visible dates
 * @param columnWidth - Tailwind CSS width class for columns
 * @param milestones - Array of milestones (only for projects)
 * @param onMilestoneToggle - Callback to toggle milestones (only for projects)
 */
export function TimelineItemHeader({
  type,
  item,
  isExpanded,
  canEdit,
  onToggleExpand,
  dates,
  columnWidth,
  milestones,
  onMilestoneToggle,
}: TimelineItemHeaderProps) {
  const today = new Date()

  /**
   * Check if a date is the start of a week
   */
  const isWeekStart = (date: Date, dateIndex: number): boolean => {
    if (dateIndex === 0) return true
    return getDay(date) === 1
  }

  /**
   * Render the sidebar section based on type
   */
  const renderSidebar = () => {
    if (type === 'project') {
      const project = item as Project
      return (
        <div className="w-64 p-3 border-r-2 border-border bg-background/50 flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-primary" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <div
            className={cn('flex-1', project.status === 'tentative' && 'opacity-50')}
          >
            <div className="flex items-center gap-2">
              <div className="font-semibold text-sm">{project.name}</div>
              {project.status === 'tentative' && (
                <div className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Clock className="h-3 w-3" />
                </div>
              )}
            </div>
            <div className="text-xs">
              {project.customer?.icon && `${project.customer.icon} `}
              {project.customer?.name}
            </div>
          </div>
        </div>
      )
    } else {
      const member = item as TeamMember
      return (
        <div className="w-64 p-3 border-r-2 border-border bg-background/50 flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-primary" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <Avatar className="h-8 w-8 ring-2 ring-border/50">
            <AvatarImage src={member.avatarUrl || undefined} />
            <AvatarFallback
              style={{
                backgroundColor: getAvatarColor(member.firstName, member.lastName).bg,
                color: getAvatarColor(member.firstName, member.lastName).text,
              }}
            >
              {getInitials(member.firstName, member.lastName)}
            </AvatarFallback>
          </Avatar>
          <span className="font-semibold text-sm">
            {member.firstName} {member.lastName}
          </span>
        </div>
      )
    }
  }

  /**
   * Render date cells
   */
  const renderDateCells = () => {
    return dates.map((date, dateIndex) => {
      const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
      const isWeekendDay = isWeekend(date)
      const isHolidayDay = isHoliday(date)

      return (
        <div
          key={date.toISOString()}
          className={cn(
            columnWidth,
            'border-r relative flex items-center justify-center',
            isWeekendDay && 'bg-weekend',
            isHolidayDay && 'bg-holiday',
            isToday && 'bg-primary/10 border-x-2 border-x-primary',
            isFirstDayOfMonth(date) && 'border-l-4 border-l-border',
            isWeekStart(date, dateIndex) &&
              !isFirstDayOfMonth(date) &&
              'border-l-4 border-l-muted-foreground',
            canEdit && type === 'project' && 'cursor-pointer'
          )}
          onClick={
            type === 'project' && onMilestoneToggle
              ? (e) => onMilestoneToggle((item as Project).id, date, e)
              : undefined
          }
          onContextMenu={
            type === 'project' && onMilestoneToggle
              ? (e) => onMilestoneToggle((item as Project).id, date, e)
              : undefined
          }
        >
          {type === 'project' && milestones && onMilestoneToggle && (
            <MilestoneIndicator
              projectId={(item as Project).id}
              date={date}
              milestones={milestones}
              canEdit={canEdit}
              onToggle={onMilestoneToggle}
            />
          )}
        </div>
      )
    })
  }

  return (
    <div
      className="flex border-b-4 border-border bg-muted/70 hover:bg-muted/90 cursor-pointer transition-colors"
      onClick={() => onToggleExpand(item.id)}
    >
      {renderSidebar()}
      {renderDateCells()}
    </div>
  )
}
