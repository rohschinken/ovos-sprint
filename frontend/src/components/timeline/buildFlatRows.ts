import { hasAssignmentInDateRange } from '@/lib/timeline-helpers'
import type {
  Project,
  TeamMember,
  ProjectAssignment,
  DayAssignment,
  TimelineViewMode,
} from '@/types'
import type { FlatRow } from './types'

export interface BuildFlatRowsParams {
  viewMode: TimelineViewMode
  items: (Project | TeamMember)[]
  projectAssignments: ProjectAssignment[]
  dayAssignments: DayAssignment[]
  dates: Date[]
  expandedItems: Set<number>
  hideEmptyRows: boolean
  showTentative: boolean
  memberById: Map<number, TeamMember>
  projectById: Map<number, Project>
}

/**
 * Flatten the nested item → assignment hierarchy into a single array
 * suitable for the row virtualizer.
 *
 * Each parent (project or member) becomes a `type: 'parent'` row.
 * Each visible assignment under an expanded parent becomes a `type: 'child'` row.
 *
 * Handles:
 * - Collapsed parents (no children emitted)
 * - hideEmptyRows (skip children with no day assignments in range; skip parent if all children filtered)
 * - showTentative (in by-member view, skip tentative project children when false)
 * - Orphan assignments (child entity not found → skip)
 */
export function buildFlatRows({
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
}: BuildFlatRowsParams): FlatRow[] {
  const rows: FlatRow[] = []

  for (const item of items) {
    // Get assignments for this parent
    const itemId = item.id
    const assignments = viewMode === 'by-project'
      ? projectAssignments.filter(pa => pa.projectId === itemId)
      : projectAssignments.filter(pa => pa.teamMemberId === itemId)

    // Apply hideEmptyRows: filter to assignments with day assignments in range
    const visibleAssignments = hideEmptyRows
      ? assignments.filter(a => hasAssignmentInDateRange(dayAssignments, a.id, dates))
      : assignments

    // Skip parent entirely if all children filtered out
    if (hideEmptyRows && visibleAssignments.length === 0) continue

    rows.push({ type: 'parent', key: `parent-${itemId}`, item })

    // Skip children if collapsed
    if (!expandedItems.has(itemId)) continue

    for (const assignment of visibleAssignments) {
      // Resolve child entity
      const childItem = viewMode === 'by-project'
        ? memberById.get(assignment.teamMemberId)
        : projectById.get(assignment.projectId)
      if (!childItem) continue

      // By-member view: skip tentative projects when showTentative is false
      if (
        viewMode === 'by-member' &&
        !showTentative &&
        (childItem as Project).status === 'tentative'
      ) continue

      rows.push({
        type: 'child',
        key: `child-${assignment.id}`,
        parentItem: item,
        childItem,
        assignment,
      })
    }
  }

  return rows
}
