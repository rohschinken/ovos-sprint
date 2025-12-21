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

interface ExpandResult {
  expanded: boolean
  groupId?: number
  newStartDate?: string
  newEndDate?: string
}

/**
 * Handle potential group expansion or merges when a new day is added.
 * This should be called after creating a day assignment.
 *
 * 1. If new day is adjacent to an existing group, expand that group to include it
 * 2. If new day connects two existing groups, merge them (shorter group's data is overridden)
 */
export async function handleGroupMergeOnDayAdd(
  projectAssignmentId: number,
  newDate: string
): Promise<MergeResult> {
  // Find all groups for this projectAssignment
  const groups = await db
    .select()
    .from(assignmentGroups)
    .where(eq(assignmentGroups.projectAssignmentId, projectAssignmentId))

  if (groups.length === 0) {
    return { merged: false }
  }

  // Sort groups by startDate
  groups.sort((a, b) => a.startDate.localeCompare(b.startDate))

  // First, check if the new day is adjacent to any existing group (expand case)
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

    return {
      merged: false,
      survivingGroupId: adjacentAfter.id,
      newStartDate,
      newEndDate: adjacentAfter.endDate
    }
  }

  return { merged: false }
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
