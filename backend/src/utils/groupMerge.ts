import { db, assignmentGroups, dayAssignments } from '../db/index.js'
import { eq, and, gte, lte } from 'drizzle-orm'

/**
 * Calculate the number of days in a date range (inclusive)
 */
function dayCount(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

/**
 * Add one day to a date string
 */
function addDay(dateStr: string): string {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + 1)
  return date.toISOString().split('T')[0]
}

/**
 * Subtract one day from a date string
 */
function subtractDay(dateStr: string): string {
  const date = new Date(dateStr)
  date.setDate(date.getDate() - 1)
  return date.toISOString().split('T')[0]
}

interface MergeResult {
  merged: boolean
  survivingGroupId?: number
  deletedGroupId?: number
  newStartDate?: string
  newEndDate?: string
}

/**
 * Handle potential group expansion or merges when a new day is added.
 * This should be called after creating a day assignment.
 *
 * 1. If new day falls inside an existing group's range, no change needed
 * 2. If new day is adjacent to an existing group, expand that group to include it
 * 3. If new day connects two existing groups, merge them (shorter group's data is overridden)
 * 4. After expansion, check if any groups now overlap or are adjacent and merge them
 * 5. Expand group to cover all contiguous day assignments
 */
export async function handleGroupMergeOnDayAdd(
  projectAssignmentId: number,
  newDate: string
): Promise<MergeResult> {
  // Find all groups for this projectAssignment
  let groups = await db
    .select()
    .from(assignmentGroups)
    .where(eq(assignmentGroups.projectAssignmentId, projectAssignmentId))

  if (groups.length === 0) {
    return { merged: false }
  }

  // Sort groups by startDate
  groups.sort((a, b) => a.startDate.localeCompare(b.startDate))

  // First check if new day is already inside an existing group - no action needed
  const containingGroup = groups.find(g => g.startDate <= newDate && g.endDate >= newDate)
  if (containingGroup) {
    // Even if day is inside group, expand to cover all contiguous days
    await expandGroupToContiguousDays(containingGroup.id, projectAssignmentId)
    return { merged: false }
  }

  // Check if the new day is adjacent to any existing group (expand case)
  const dayBefore = subtractDay(newDate)
  const dayAfter = addDay(newDate)

  // Find groups that the new date is adjacent to
  const adjacentBefore = groups.find(g => g.endDate === dayBefore)
  const adjacentAfter = groups.find(g => g.startDate === dayAfter)

  // Case 1: New day bridges two groups - merge them
  if (adjacentBefore && adjacentAfter && adjacentBefore.id !== adjacentAfter.id) {
    const countBefore = dayCount(adjacentBefore.startDate, adjacentBefore.endDate)
    const countAfter = dayCount(adjacentAfter.startDate, adjacentAfter.endDate)

    let survivor: typeof adjacentBefore
    let loser: typeof adjacentAfter

    if (countBefore >= countAfter) {
      survivor = adjacentBefore
      loser = adjacentAfter
    } else {
      survivor = adjacentAfter
      loser = adjacentBefore
    }

    // Update survivor to span both ranges plus the new day
    const newStartDate = adjacentBefore.startDate
    const newEndDate = adjacentAfter.endDate

    await db
      .update(assignmentGroups)
      .set({ startDate: newStartDate, endDate: newEndDate })
      .where(eq(assignmentGroups.id, survivor.id))

    // Delete the loser
    await db.delete(assignmentGroups).where(eq(assignmentGroups.id, loser.id))

    // Expand to cover all contiguous days
    await expandGroupToContiguousDays(survivor.id, projectAssignmentId)

    return {
      merged: true,
      survivingGroupId: survivor.id,
      deletedGroupId: loser.id,
      newStartDate,
      newEndDate
    }
  }

  // Case 2: New day is adjacent to one group - expand it
  if (adjacentBefore) {
    const newEndDate = newDate
    await db
      .update(assignmentGroups)
      .set({ endDate: newEndDate })
      .where(eq(assignmentGroups.id, adjacentBefore.id))

    // Expand to cover all contiguous days and merge any adjacent groups
    await expandGroupToContiguousDays(adjacentBefore.id, projectAssignmentId)
    await mergeAdjacentGroups(projectAssignmentId)

    return {
      merged: false,
      survivingGroupId: adjacentBefore.id,
      newStartDate: adjacentBefore.startDate,
      newEndDate
    }
  }

  if (adjacentAfter) {
    const newStartDate = newDate
    await db
      .update(assignmentGroups)
      .set({ startDate: newStartDate })
      .where(eq(assignmentGroups.id, adjacentAfter.id))

    // Expand to cover all contiguous days and merge any adjacent groups
    await expandGroupToContiguousDays(adjacentAfter.id, projectAssignmentId)
    await mergeAdjacentGroups(projectAssignmentId)

    return {
      merged: false,
      survivingGroupId: adjacentAfter.id,
      newStartDate,
      newEndDate: adjacentAfter.endDate
    }
  }

  return { merged: false }
}

/**
 * Expand a group to cover all contiguous day assignments.
 * This ensures that if days exist before or after the group's current range,
 * the group expands to include them.
 */
async function expandGroupToContiguousDays(groupId: number, projectAssignmentId: number): Promise<void> {
  const group = await db.query.assignmentGroups.findFirst({
    where: (ag, { eq }) => eq(ag.id, groupId)
  })

  if (!group) return

  // Get all day assignments for this project assignment, sorted by date
  const days = await db
    .select()
    .from(dayAssignments)
    .where(eq(dayAssignments.projectAssignmentId, projectAssignmentId))

  if (days.length === 0) return

  // Sort days by date
  days.sort((a, b) => a.date.localeCompare(b.date))

  // Find the contiguous range that includes any day within the current group range
  let rangeStart: string | null = null
  let rangeEnd: string | null = null
  let inRange = false
  let lastDate: string | null = null

  for (const day of days) {
    const isContiguous = lastDate === null || day.date === addDay(lastDate)
    const isInGroupRange = day.date >= group.startDate && day.date <= group.endDate

    if (isInGroupRange) {
      // This day is in the group's range
      if (!inRange) {
        // Start of contiguous range - go back to find the actual start
        rangeStart = day.date
        // Walk backwards through days to find contiguous start
        for (let i = days.indexOf(day) - 1; i >= 0; i--) {
          if (days[i].date === subtractDay(rangeStart)) {
            rangeStart = days[i].date
          } else {
            break
          }
        }
        inRange = true
      }
      rangeEnd = day.date
      lastDate = day.date
    } else if (inRange) {
      // We're tracking a range and this day might extend it
      if (isContiguous) {
        rangeEnd = day.date
        lastDate = day.date
      } else {
        // Gap found, stop extending
        break
      }
    } else {
      lastDate = day.date
    }
  }

  // If we found a range that differs from the current group range, update it
  if (rangeStart && rangeEnd && (rangeStart !== group.startDate || rangeEnd !== group.endDate)) {
    await db
      .update(assignmentGroups)
      .set({ startDate: rangeStart, endDate: rangeEnd })
      .where(eq(assignmentGroups.id, groupId))
  }
}

/**
 * Merge any adjacent or overlapping groups for a project assignment.
 * This consolidates groups that have become adjacent due to day additions.
 */
async function mergeAdjacentGroups(projectAssignmentId: number): Promise<void> {
  let groups = await db
    .select()
    .from(assignmentGroups)
    .where(eq(assignmentGroups.projectAssignmentId, projectAssignmentId))

  if (groups.length <= 1) return

  // Sort by startDate
  groups.sort((a, b) => a.startDate.localeCompare(b.startDate))

  // Keep merging until no more adjacent/overlapping groups
  let merged = true
  while (merged) {
    merged = false
    groups = await db
      .select()
      .from(assignmentGroups)
      .where(eq(assignmentGroups.projectAssignmentId, projectAssignmentId))

    if (groups.length <= 1) break
    groups.sort((a, b) => a.startDate.localeCompare(b.startDate))

    for (let i = 0; i < groups.length - 1; i++) {
      const current = groups[i]
      const next = groups[i + 1]

      // Check if adjacent (current.endDate + 1 day = next.startDate) or overlapping
      const dayAfterCurrent = addDay(current.endDate)
      if (dayAfterCurrent >= next.startDate) {
        // Groups are adjacent or overlapping - merge them
        const countCurrent = dayCount(current.startDate, current.endDate)
        const countNext = dayCount(next.startDate, next.endDate)

        const survivor = countCurrent >= countNext ? current : next
        const loser = countCurrent >= countNext ? next : current

        // New range spans both
        const newStartDate = current.startDate < next.startDate ? current.startDate : next.startDate
        const newEndDate = current.endDate > next.endDate ? current.endDate : next.endDate

        await db
          .update(assignmentGroups)
          .set({ startDate: newStartDate, endDate: newEndDate })
          .where(eq(assignmentGroups.id, survivor.id))

        await db.delete(assignmentGroups).where(eq(assignmentGroups.id, loser.id))

        merged = true
        break
      }
    }
  }
}

interface SplitResult {
  split: boolean
  originalGroupId?: number
  newGroups?: { id: number; startDate: string; endDate: string }[]
}

/**
 * Handle group splitting when a day is deleted from the middle of a group.
 * This should be called after deleting a day assignment.
 *
 * If the deleted day was in the middle of a group's range:
 * - Split into two groups
 * - Both inherit the original priority/comment
 */
export async function handleGroupSplitOnDayDelete(
  projectAssignmentId: number,
  deletedDate: string
): Promise<SplitResult> {
  // Find any group that contains the deleted date
  const groups = await db
    .select()
    .from(assignmentGroups)
    .where(
      and(
        eq(assignmentGroups.projectAssignmentId, projectAssignmentId),
        lte(assignmentGroups.startDate, deletedDate),
        gte(assignmentGroups.endDate, deletedDate)
      )
    )

  if (groups.length === 0) {
    return { split: false }
  }

  const group = groups[0]

  // Check if deleted date is at an edge (no split needed, just shrink or delete)
  if (group.startDate === deletedDate && group.endDate === deletedDate) {
    // Single-day group, delete it entirely
    await db.delete(assignmentGroups).where(eq(assignmentGroups.id, group.id))
    return { split: false }
  }

  if (group.startDate === deletedDate) {
    // Deleted first day, shrink from start
    await db
      .update(assignmentGroups)
      .set({ startDate: addDay(deletedDate) })
      .where(eq(assignmentGroups.id, group.id))
    return { split: false }
  }

  if (group.endDate === deletedDate) {
    // Deleted last day, shrink from end
    await db
      .update(assignmentGroups)
      .set({ endDate: subtractDay(deletedDate) })
      .where(eq(assignmentGroups.id, group.id))
    return { split: false }
  }

  // Deleted a middle day - need to split
  const leftEndDate = subtractDay(deletedDate)
  const rightStartDate = addDay(deletedDate)

  // Update original group to be the left portion
  await db
    .update(assignmentGroups)
    .set({ endDate: leftEndDate })
    .where(eq(assignmentGroups.id, group.id))

  // Create new group for the right portion (inherits priority and comment)
  const [newGroup] = await db
    .insert(assignmentGroups)
    .values({
      projectAssignmentId: group.projectAssignmentId,
      startDate: rightStartDate,
      endDate: group.endDate,
      priority: group.priority,
      comment: group.comment
    })
    .returning()

  return {
    split: true,
    originalGroupId: group.id,
    newGroups: [
      { id: group.id, startDate: group.startDate, endDate: leftEndDate },
      { id: newGroup.id, startDate: rightStartDate, endDate: group.endDate }
    ]
  }
}

/**
 * Update a group's date range to match the actual contiguous assignment range.
 * This can be used to expand or shrink a group when days are added/removed at edges.
 */
export async function syncGroupDateRange(
  groupId: number,
  newStartDate: string,
  newEndDate: string
): Promise<void> {
  await db
    .update(assignmentGroups)
    .set({ startDate: newStartDate, endDate: newEndDate })
    .where(eq(assignmentGroups.id, groupId))
}

/**
 * Clean up orphaned groups (groups with no actual day assignments in their range)
 */
export async function cleanupOrphanedGroups(projectAssignmentId: number): Promise<number[]> {
  const groups = await db
    .select()
    .from(assignmentGroups)
    .where(eq(assignmentGroups.projectAssignmentId, projectAssignmentId))

  const deletedIds: number[] = []

  for (const group of groups) {
    // Check if any days exist in this group's range
    const days = await db
      .select()
      .from(dayAssignments)
      .where(
        and(
          eq(dayAssignments.projectAssignmentId, projectAssignmentId),
          gte(dayAssignments.date, group.startDate),
          lte(dayAssignments.date, group.endDate)
        )
      )
      .limit(1)

    if (days.length === 0) {
      await db.delete(assignmentGroups).where(eq(assignmentGroups.id, group.id))
      deletedIds.push(group.id)
    }
  }

  return deletedIds
}
