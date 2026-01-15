import { format, isSameDay, isFirstDayOfMonth, getDay, getISOWeek } from 'date-fns'
import { enGB } from 'date-fns/locale'
import { Clock } from 'lucide-react'
import { cn, getInitials, getAvatarColor } from '@/lib/utils'
import { isHoliday, isWeekend } from '@/lib/holidays'
import { isDayAssigned } from '@/lib/timeline-helpers'
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar'
import { ExpandedAssignmentBar } from './ExpandedAssignmentBar'
import { AssignmentCommentOverlay } from './AssignmentCommentOverlay'
import { MilestoneIndicator } from './MilestoneIndicator'
import type {
  ProjectAssignment,
  TeamMember,
  Project,
  DayAssignment,
  AssignmentGroup,
  Milestone,
  DayOff,
  AssignmentPriority,
} from '@/types/index'

/**
 * Props for AssignmentRow component
 */
interface AssignmentRowProps {
  viewMode: 'by-project' | 'by-member'
  assignment: ProjectAssignment
  parentItem: Project | TeamMember
  childItem: TeamMember | Project
  dates: Date[]
  columnWidth: string
  zoomLevel: number
  isAdmin: boolean
  showOverlaps: boolean
  // Data
  dayAssignments: DayAssignment[]
  assignmentGroups: AssignmentGroup[]
  projectAssignments: ProjectAssignment[]
  projects: Project[]
  dayOffs: DayOff[]
  milestones: Milestone[]
  // State
  dragState: {
    assignmentId: number | null
    startDate: Date | null
    endDate: Date | null
  }
  // Handlers
  handleMouseDown: (assignmentId: number, date: Date, e: React.MouseEvent) => void
  handleMouseEnter: (date: Date) => void
  handleAssignmentClick: (assignmentId: number, date: Date, e: React.MouseEvent) => void
  handleDeleteDayAssignment: (assignmentId: number, date: Date, e: React.MouseEvent) => void
  handleProjectCellClick: (projectId: number, date: Date, e: React.MouseEvent) => void
  // Helper functions
  isDayInDragRange: (assignmentId: number, date: Date) => boolean
  isDayOff: (memberId: number, date: Date) => boolean
  hasOverlap: (id: number, date: Date, mode: 'member' | 'project') => boolean
  canEditAssignment: (assignmentId: number) => boolean
  canEditProject: (projectId: number) => boolean
  getGroupPriority: (assignmentId: number, date: Date) => AssignmentPriority
}

/**
 * AssignmentRow Component
 *
 * Renders a single assignment row showing dates with assignment bars, day-off indicators, and milestones.
 * Used in both by-project and by-member views within expanded items.
 *
 * In by-project view (member rows):
 * - Shows member avatar and name
 * - Shows member role badge
 * - Date cells can have day-off indicators
 * - Assignment bars colored based on overlap (orange if overlap, green otherwise)
 *
 * In by-member view (project rows):
 * - Shows project customer and name
 * - Shows project status (Clock icon for tentative)
 * - Date cells can have milestone indicators
 * - Assignment bars always green
 *
 * Features:
 * - Responsive row structure with sticky sidebar
 * - Uses all small components: DayOffIndicator, ExpandedAssignmentBar, AssignmentCommentOverlay, MilestoneIndicator
 * - Week start and month start borders on date cells
 * - Today highlighting
 * - Holiday and weekend styling
 * - Interactive drag-to-assign functionality
 * - Click/right-click to delete assignments
 *
 * @param viewMode - Current view mode ('by-project' or 'by-member')
 * @param assignment - The project assignment to render
 * @param parentItem - The expanded parent (project or member)
 * @param childItem - The row item (member or project)
 * @param dates - Array of dates to display
 * @param columnWidth - Width class for date columns
 * @param zoomLevel - Current zoom level
 * @param isAdmin - Whether current user has admin permissions
 * @param showOverlaps - Whether to show overlap visualization
 * @param dayAssignments - All day assignments
 * @param assignmentGroups - All assignment groups
 * @param projectAssignments - All project assignments
 * @param projects - All projects
 * @param dayOffs - All day-off records
 * @param milestones - All milestones
 * @param dragState - Current drag state
 * @param handleMouseDown - Handler for mouse down (drag start)
 * @param handleMouseEnter - Handler for mouse enter (drag continue)
 * @param handleAssignmentClick - Handler for assignment click
 * @param handleDeleteDayAssignment - Handler for delete assignment
 * @param handleProjectCellClick - Handler for project cell click (milestone toggle)
 * @param isDayInDragRange - Check if date is in drag range
 * @param isDayOff - Check if date is a day off for member
 * @param hasOverlap - Check if date has overlap
 * @param canEditAssignment - Check if assignment can be edited
 * @param canEditProject - Check if project can be edited
 * @param getGroupPriority - Get priority for assignment on date
 */
export function AssignmentRow({
  viewMode,
  assignment,
  parentItem,
  childItem,
  dates,
  columnWidth,
  zoomLevel,
  isAdmin,
  showOverlaps: _showOverlaps,
  dayAssignments,
  assignmentGroups,
  projectAssignments,
  projects: _projects,
  dayOffs: _dayOffs,
  milestones,
  dragState: _dragState,
  handleMouseDown,
  handleMouseEnter,
  handleAssignmentClick,
  handleDeleteDayAssignment,
  handleProjectCellClick,
  isDayInDragRange,
  isDayOff,
  hasOverlap,
  canEditAssignment: _canEditAssignment,
  canEditProject,
  getGroupPriority,
}: AssignmentRowProps) {
  const today = new Date()

  /**
   * Week separator helper - checks if a date should show a week boundary
   */
  const isWeekStart = (date: Date, index: number) => {
    // First visible date always gets a separator
    if (index === 0) return true

    // Monday (getDay returns 1 for Monday) gets a separator
    if (getDay(date) === 1) return true

    // If previous visible date is from a different week (important when weekends are hidden)
    if (index > 0) {
      const prevDate = dates[index - 1]
      if (getISOWeek(prevDate) !== getISOWeek(date)) return true
    }

    return false
  }

  // Render by-project view (member rows)
  if (viewMode === 'by-project') {
    const member = childItem as TeamMember
    const project = parentItem as Project

    return (
      <div key={assignment.id} className="flex border-b bg-background hover:bg-muted/20 transition-colors relative">
        <div className="sticky left-0 z-50 w-64 p-2.5 pl-10 border-r flex items-center gap-2 bg-background shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
          <Avatar className="h-6 w-6 ring-1 ring-border/50">
            <AvatarImage src={member.avatarUrl || undefined} />
            <AvatarFallback
              className="text-xs"
              style={{
                backgroundColor: getAvatarColor(member.firstName, member.lastName).bg,
                color: getAvatarColor(member.firstName, member.lastName).text,
              }}
            >
              {getInitials(member.firstName, member.lastName)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">
            {member.firstName} {member.lastName}
          </span>
        </div>
        {dates.map((date, dateIndex) => (
          <div
            key={date.toISOString()}
            className={cn(
              columnWidth, 'border-r group relative flex items-center justify-center select-none',
              project.status === 'tentative' && 'bg-background',
              isWeekend(date) && 'bg-weekend',
              isHoliday(date) && 'bg-holiday',
              isDayOff(member.id, date) && 'bg-dayOff',
              isSameDay(date, today) && 'bg-primary/10 border-x-2 border-x-primary',
              isAdmin && 'cursor-pointer',
              isFirstDayOfMonth(date) && 'border-l-4 border-l-border',
              isWeekStart(date, dateIndex) && !isFirstDayOfMonth(date) && 'border-l-4 border-l-muted-foreground'
            )}
            onMouseDown={(_e) =>
              handleMouseDown(assignment.id, date, _e)
            }
            onMouseEnter={() => handleMouseEnter(date)}
            onClick={(e) => {
              if ((e.ctrlKey || e.metaKey) && isDayAssigned(dayAssignments, assignment.id, date)) {
                handleDeleteDayAssignment(assignment.id, date, e)
              }
            }}
            onContextMenu={(_e) => {
              _e.preventDefault() // Prevent browser context menu
              if (isDayAssigned(dayAssignments, assignment.id, date)) {
                handleDeleteDayAssignment(assignment.id, date, _e)
              }
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <span className="text-xs text-muted-foreground/40 dark:text-muted-foreground/60 font-medium">
                {format(date, 'EEE', { locale: enGB })}
              </span>
            </div>
            <ExpandedAssignmentBar
              assignmentId={assignment.id}
              date={date}
              projectAssignments={projectAssignments}
              dayAssignments={dayAssignments}
              project={project}
              isDayInDragRange={isDayInDragRange(assignment.id, date)}
              isAdmin={isAdmin}
              hasOverlap={hasOverlap(member.id, date, 'member')}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                if (isDayAssigned(dayAssignments, assignment.id, date)) {
                  handleAssignmentClick(assignment.id, date, e)
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                if (isDayAssigned(dayAssignments, assignment.id, date)) {
                  handleDeleteDayAssignment(assignment.id, date, e)
                }
              }}
              getGroupPriority={getGroupPriority}
            />
          </div>
        ))}
        {/* Comment overlay rendered at row level to appear above all bar segments */}
        <AssignmentCommentOverlay
          assignmentId={assignment.id}
          dates={dates}
          dayAssignments={dayAssignments}
          assignmentGroups={assignmentGroups}
          zoomLevel={zoomLevel}
          onCommentClick={(assignmentId, date, e) => {
            handleAssignmentClick(assignmentId, date, e)
          }}
          onCommentContextMenu={(assignmentId, date, e) => {
            handleDeleteDayAssignment(assignmentId, date, e)
          }}
        />
      </div>
    )
  }

  // Render by-member view (project rows)
  const project = childItem as Project
  const member = parentItem as TeamMember

  return (
    <div key={assignment.id} className="flex border-b bg-background hover:bg-muted/20 transition-colors relative">
      <div className="sticky left-0 z-50 w-64 p-2 pl-10 border-r bg-background shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-1.5">
          <div className={cn(
            "text-sm font-medium",
            project.status === 'tentative' && 'text-muted-foreground'
          )}>{project.name}</div>
          {project.status === 'tentative' ? (
            <div className="flex items-center text-sm font-medium text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
            </div>
          ) : (
            ""
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
      {dates.map((date, dateIndex) => (
        <div
          key={date.toISOString()}
          className={cn(
            columnWidth, 'border-r group relative flex items-center justify-center select-none',
            project.status === 'tentative' && 'bg-background',
            isWeekend(date) && 'bg-weekend',
            isHoliday(date) && 'bg-holiday',
            isDayOff(member.id, date) && 'bg-dayOff',
            isSameDay(date, today) && 'bg-primary/10 border-x-2 border-x-primary',
            isAdmin && 'cursor-pointer',
            isFirstDayOfMonth(date) && 'border-l-4 border-l-border',
            isWeekStart(date, dateIndex) && !isFirstDayOfMonth(date) && 'border-l-4 border-l-muted-foreground'
          )}
          onMouseDown={(_e) =>
            handleMouseDown(assignment.id, date, _e)
          }
          onMouseEnter={() => handleMouseEnter(date)}
          onClick={(e) => {
            if ((e.ctrlKey || e.metaKey) && isDayAssigned(dayAssignments, assignment.id, date)) {
              handleDeleteDayAssignment(assignment.id, date, e)
            }
          }}
          onContextMenu={(_e) => {
            _e.preventDefault() // Prevent browser context menu
            if (isDayAssigned(dayAssignments, assignment.id, date)) {
              handleDeleteDayAssignment(assignment.id, date, _e)
            }
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <span className="text-xs text-muted-foreground/40 dark:text-muted-foreground/80 font-medium">
              {format(date, 'EEE', { locale: enGB })}
            </span>
          </div>
          <MilestoneIndicator
            projectId={project.id}
            date={date}
            milestones={milestones}
            canEdit={canEditProject(project.id)}
            onToggle={handleProjectCellClick}
          />
          <ExpandedAssignmentBar
            assignmentId={assignment.id}
            date={date}
            projectAssignments={projectAssignments}
            dayAssignments={dayAssignments}
            project={project}
            isDayInDragRange={isDayInDragRange(assignment.id, date)}
            isAdmin={isAdmin}
            hasOverlap={false}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              if (isDayAssigned(dayAssignments, assignment.id, date)) {
                handleAssignmentClick(assignment.id, date, e)
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              if (isDayAssigned(dayAssignments, assignment.id, date)) {
                handleDeleteDayAssignment(assignment.id, date, e)
              }
            }}
            getGroupPriority={getGroupPriority}
          />
        </div>
      ))}
      {/* Comment overlay rendered at row level to appear above all bar segments */}
      <AssignmentCommentOverlay
        assignmentId={assignment.id}
        dates={dates}
        dayAssignments={dayAssignments}
        assignmentGroups={assignmentGroups}
        zoomLevel={zoomLevel}
        onCommentClick={(assignmentId, date, e) => {
          handleAssignmentClick(assignmentId, date, e)
        }}
        onCommentContextMenu={(assignmentId, date, e) => {
          handleDeleteDayAssignment(assignmentId, date, e)
        }}
      />
    </div>
  )
}
