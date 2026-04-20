import { useRef, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { TimelineHeader } from './TimelineHeader'
import { TimelineItemHeader } from './TimelineItemHeader'
import { AssignmentRow } from './AssignmentRow'
import { buildFlatRows } from './buildFlatRows'
import type { Project, TeamMember } from '@/types'
import type { TimelineViewContentProps, FlatRow } from './types'
import { ROW_HEIGHTS } from './types'

/**
 * TimelineViewContent Component
 *
 * Renders the main timeline content with a sticky header and virtualized rows.
 * Uses @tanstack/react-virtual to only render rows visible in the viewport,
 * plus an overscan buffer for smooth scrolling.
 *
 * The row list is a flat array built by `buildFlatRows`, which handles:
 * - Expanding/collapsing groups
 * - hideEmptyRows filtering
 * - showTentative filtering (by-member view)
 * - Orphan assignment skipping
 *
 * The virtualizer attaches to the existing scroll container (overflow-auto div)
 * and only manages vertical scrolling. Horizontal scrolling (date columns)
 * works naturally since each row renders the full date range.
 */
export function TimelineViewContent({
  viewMode,
  items,
  projects,
  members: _members,
  memberById,
  projectById,
  projectAssignments,
  dayAssignments,
  milestones,
  dayOffs,
  settings: _settings,
  assignmentGroups,
  dates,
  monthGroups,
  columnWidth,
  zoomLevel,
  expandedItems,
  onToggleExpand,
  isAdmin,
  showOverlaps,
  showTentative,
  hideEmptyRows,
  handleMouseDown,
  handleMouseEnter,
  handleAssignmentClick,
  handleDeleteDayAssignment,
  handleProjectCellClick,
  handleMemberCellClick,
  canEditProject,
  canEditAssignment,
  isDayOff,
  isNonWorkingDay,
  isDayInDragRange,
  getDragMode,
  hasOverlap,
  getGroupPriority,
  dragState,
}: TimelineViewContentProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Flatten the nested item → assignment hierarchy into a single array
  const flatRows = useMemo(() => buildFlatRows({
    viewMode,
    items,
    projectAssignments,
    dayAssignments,
    dates,
    expandedItems,
    hideEmptyRows,
    showTentative,
    memberById,
    projectById,
  }), [viewMode, items, projectAssignments, dayAssignments, dates, expandedItems, hideEmptyRows, showTentative, memberById, projectById])

  const heights = ROW_HEIGHTS[viewMode]

  const rowVirtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) =>
      flatRows[index].type === 'parent' ? heights.parent : heights.child,
    getItemKey: (index) => flatRows[index].key,
    overscan: 10,
  })

  // Render a parent row (TimelineItemHeader)
  const renderParentRow = (row: FlatRow & { type: 'parent' }) => {
    const item = row.item

    if (viewMode === 'by-project') {
      const project = item as Project
      return (
        <TimelineItemHeader
          type="project"
          item={project}
          isExpanded={expandedItems.has(project.id)}
          canEdit={canEditProject(project.id)}
          onToggleExpand={onToggleExpand}
          dates={dates}
          columnWidth={columnWidth}
          milestones={milestones}
          onMilestoneToggle={handleProjectCellClick}
          showOverlaps={showOverlaps}
          projectAssignments={projectAssignments}
          dayAssignments={dayAssignments}
        />
      )
    }

    // by-member
    const member = item as TeamMember
    return (
      <TimelineItemHeader
        type="member"
        item={member}
        isExpanded={expandedItems.has(member.id)}
        canEdit={isAdmin}
        onToggleExpand={onToggleExpand}
        dates={dates}
        columnWidth={columnWidth}
        dayOffs={dayOffs}
        onDayOffToggle={handleMemberCellClick}
        showOverlaps={showOverlaps}
        projectAssignments={projectAssignments}
        dayAssignments={dayAssignments}
        projects={projects}
        hasOverlap={hasOverlap}
        isNonWorkingDay={isNonWorkingDay}
      />
    )
  }

  // Render a child row (AssignmentRow)
  const renderChildRow = (row: FlatRow & { type: 'child' }) => (
    <AssignmentRow
      viewMode={viewMode}
      assignment={row.assignment}
      parentItem={row.parentItem}
      childItem={row.childItem}
      dates={dates}
      columnWidth={columnWidth}
      zoomLevel={zoomLevel}
      isAdmin={isAdmin}
      showOverlaps={showOverlaps}
      dayAssignments={dayAssignments}
      assignmentGroups={assignmentGroups}
      projectAssignments={projectAssignments}
      projects={projects}
      dayOffs={dayOffs}
      milestones={milestones}
      handleMouseDown={handleMouseDown}
      handleMouseEnter={handleMouseEnter}
      handleAssignmentClick={handleAssignmentClick}
      handleDeleteDayAssignment={handleDeleteDayAssignment}
      handleProjectCellClick={handleProjectCellClick}
      isDayInDragRange={isDayInDragRange}
      getDragMode={getDragMode}
      isDayOff={isDayOff}
      isNonWorkingDay={isNonWorkingDay}
      hasOverlap={hasOverlap}
      canEditAssignment={canEditAssignment}
      canEditProject={canEditProject}
      getGroupPriority={getGroupPriority}
      dragState={dragState}
    />
  )

  return (
    <div ref={scrollRef} className="overflow-auto max-h-full">
      <div className="min-w-max">
        {/* Sticky header — outside the virtualized list, shares the scroll container */}
        <TimelineHeader
          dates={dates}
          monthGroups={monthGroups}
          columnWidth={columnWidth}
          zoomLevel={zoomLevel}
          label={viewMode === 'by-member' ? 'Team Members' : undefined}
        />

        {/* Virtualized rows */}
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = flatRows[virtualRow.index]
            return (
              <div
                key={row.key}
                data-index={virtualRow.index}
                className="bg-background"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {row.type === 'parent'
                  ? renderParentRow(row as FlatRow & { type: 'parent' })
                  : renderChildRow(row as FlatRow & { type: 'child' })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
