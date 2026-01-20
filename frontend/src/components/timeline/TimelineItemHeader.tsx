import { format, isFirstDayOfMonth, getDay } from 'date-fns'
import { ChevronDown, ChevronRight, Clock } from 'lucide-react'
import { cn, getInitials, getAvatarColor } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { isWeekend, isHoliday } from '@/lib/holidays'
import { MilestoneIndicator } from './MilestoneIndicator'
import { CollapsedAssignmentBar } from './CollapsedAssignmentBar'
import type { Project, TeamMember } from '@/types'
import type { TimelineItemHeaderProps } from './types'

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
  dayOffs,
  onDayOffToggle,
  showOverlaps,
  projectAssignments,
  dayAssignments,
  projects,
  hasOverlap,
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
        <div className="sticky left-0 z-50 w-64 p-3 border-r-2 border-border bg-background flex items-center gap-2 shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
          {isExpanded ? (
            <ChevronDown className={cn(
              "h-4 w-4",
              project.status === 'tentative' ? 'text-muted-foreground' : 'text-primary'
            )} />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className={cn(
                "font-semibold text-sm",
                project.status === 'tentative' && 'text-muted-foreground'
              )}>{project.name}</div>
              {project.status === 'tentative' && (
                <div className="flex items-center text-sm font-medium text-muted-foreground">
                  <Clock className="h-3 w-3" />
                </div>
              )}
            </div>
            <div className={cn(
              "text-xs",
              project.status === 'tentative' && 'text-muted-foreground'
            )}>
              {project.customer?.icon && `${project.customer.icon} `}
              {project.customer?.name}
            </div>
          </div>
        </div>
      )
    } else {
      const member = item as TeamMember
      return (
        <div className="sticky left-0 z-50 w-64 p-3 border-r-2 border-border bg-background flex items-center gap-2 shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
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
   * Check if a date is a day-off for the member
   */
  const isDayOff = (date: Date): boolean => {
    if (type !== 'member' || !dayOffs) return false
    const dateStr = format(date, 'yyyy-MM-dd')
    return dayOffs.some(
      (dayOff) => dayOff.teamMemberId === (item as TeamMember).id && dayOff.date === dateStr
    )
  }

  /**
   * Render date cells
   */
  const renderDateCells = () => {
    return dates.map((date, dateIndex) => {
      const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
      const isWeekendDay = isWeekend(date)
      const isHolidayDay = isHoliday(date)
      const isDayOffDay = isDayOff(date)

      return (
        <Tooltip key={date.toISOString()}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                columnWidth,
                'border-r relative flex items-center justify-center text-[10px]',
                isWeekendDay && 'bg-weekend',
                isHolidayDay && 'bg-holiday',
                isDayOffDay && 'bg-dayOff',
                isToday && 'bg-primary/10 border-x-2 border-x-primary',
                isFirstDayOfMonth(date) && 'border-l-4 border-l-border',
                isWeekStart(date, dateIndex) &&
                  !isFirstDayOfMonth(date) &&
                  'border-l-4 border-l-muted-foreground',
                canEdit && (type === 'project' || type === 'member') && 'cursor-pointer'
              )}
              onClick={
                type === 'project' && onMilestoneToggle
                  ? (e) => onMilestoneToggle((item as Project).id, date, e)
                  : type === 'member' && onDayOffToggle
                  ? (e) => onDayOffToggle((item as TeamMember).id, date, e)
                  : undefined
              }
              onContextMenu={
                type === 'project' && onMilestoneToggle
                  ? (e) => onMilestoneToggle((item as Project).id, date, e)
                  : type === 'member' && onDayOffToggle
                  ? (e) => onDayOffToggle((item as TeamMember).id, date, e)
                  : undefined
              }
            >
              {/* Render CollapsedAssignmentBar when NOT expanded */}
              {!isExpanded && type === 'project' && (
                <CollapsedAssignmentBar
                  type="project"
                  id={(item as Project).id}
                  date={date}
                  projectAssignments={projectAssignments}
                  dayAssignments={dayAssignments}
                  isTentative={(item as Project).status === 'tentative'}
                  hasOverlap={false} // Projects don't show overlaps
                  showOverlaps={showOverlaps}
                />
              )}

              {!isExpanded && type === 'member' && hasOverlap && (
                <CollapsedAssignmentBar
                  type="member"
                  id={(item as TeamMember).id}
                  date={date}
                  projectAssignments={projectAssignments}
                  dayAssignments={dayAssignments}
                  projects={projects || []}
                  hasOverlap={hasOverlap((item as TeamMember).id, date, 'member')}
                  showOverlaps={showOverlaps}
                />
              )}

              {/* Existing milestone indicator */}
              {type === 'project' && milestones && onMilestoneToggle && (
                <MilestoneIndicator
                  projectId={(item as Project).id}
                  date={date}
                  milestones={milestones}
                  canEdit={canEdit}
                  onToggle={onMilestoneToggle}
                />
              )}

              {/* Existing day-off indicator */}
              {type === 'member' && isDayOffDay && (
                <div className="absolute bottom-0 left-0 right-0 text-[10px] text-dayOffText text-center font-medium pointer-events-none">
                  vac. 🏝️
                </div>
              )}
            </div>
          </TooltipTrigger>
          {canEdit && (
            <TooltipContent side="top" className="text-xs">
              {type === 'project' ? 'Add/remove milestone' : 'Add/remove day off'}
            </TooltipContent>
          )}
        </Tooltip>
      )
    })
  }

  return (
    <div
      className={cn(
        "flex border-b-4 border-border cursor-pointer transition-colors",
        type === 'project' && (item as Project).status === 'tentative'
          ? 'bg-muted hover:bg-muted/90'
          : 'bg-muted/70 hover:bg-muted/90'
      )}
      onClick={() => onToggleExpand(item.id)}
    >
      {renderSidebar()}
      {renderDateCells()}
    </div>
  )
}
