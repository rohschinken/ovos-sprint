import { db, assignmentGroups, dayAssignments } from '../db/index.js'
import { eq, and, gte, lte, ne, inArray } from 'drizzle-orm'

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

/**
 * Comprehensive merge handler for assignment day modifications.
 * Handles ALL edge cases:
 * 1. Duplicate days within the same ProjectAssignment (from different groups)
 * 2. Overlaps with different ProjectAssignments (same project+member)
 * 3. Adjacent blocks that should merge
 * 4. Contiguous group consolidation
 *
 * Call this after any operation that modifies day assignments.
 */
export async function handleAssignmentMerge(
  projectAssignmentId: number,
  modifiedDates: string[],
  options?: {
    expandSearchForAdjacent?: boolean // Look for adjacent blocks in other ProjectAssignments
  }
): Promise<void> {
  // Get project assignment details
  const projectAssignment = await db.query.projectAssignments.findFirst({
    where: (pa, { eq }) => eq(pa.id, projectAssignmentId)
  })

  if (!projectAssignment) {
    return
  }

  // STEP 1: Remove duplicate days within the same ProjectAssignment (from different groups)
  await removeDuplicateDaysWithinPA(projectAssignmentId)

  // STEP 2: Check for overlaps/adjacency with OTHER ProjectAssignments (same project+member)
  if (options?.expandSearchForAdjacent) {
    await mergeWithOtherProjectAssignments(projectAssignment, modifiedDates)
  }

  // STEP 3: Use existing merge logic for each modified date segment
  await mergeGroupsForProjectAssignment(projectAssignmentId, modifiedDates)

  // STEP 4: Clean up any orphaned groups
  await cleanupOrphanedGroups(projectAssignmentId)
}

/**
 * Remove duplicate day assignments within the same ProjectAssignment.
 * Keeps only one day assignment per date (the oldest by ID).
 */
async function removeDuplicateDaysWithinPA(projectAssignmentId: number): Promise<void> {
  const allDays = await db
    .select()
    .from(dayAssignments)
    .where(eq(dayAssignments.projectAssignmentId, projectAssignmentId))

  // Group by date
  const daysByDate = new Map<string, typeof allDays>()
  for (const day of allDays) {
    if (!daysByDate.has(day.date)) {
      daysByDate.set(day.date, [])
    }
    daysByDate.get(day.date)!.push(day)
  }

  // Find duplicates and delete extras
  const toDelete: number[] = []
  for (const [, days] of daysByDate.entries()) {
    if (days.length > 1) {
      // Sort by ID and keep the first (oldest), delete the rest
      days.sort((a, b) => a.id - b.id)
      for (let i = 1; i < days.length; i++) {
        toDelete.push(days[i].id)
      }
    }
  }

  if (toDelete.length > 0) {
    await db.delete(dayAssignments).where(
      inArray(dayAssignments.id, toDelete)
    )
  }
}

/**
 * Merge with other ProjectAssignments (same project+member) if they overlap or are adjacent.
 */
async function mergeWithOtherProjectAssignments(
  projectAssignment: any,
  modifiedDates: string[]
): Promise<void> {
  if (modifiedDates.length === 0) return

  // Expand search range to catch adjacent blocks
  const sortedDates = [...modifiedDates].sort()
  const minDate = new Date(sortedDates[0])
  minDate.setDate(minDate.getDate() - 1)
  const maxDate = new Date(sortedDates[sortedDates.length - 1])
  maxDate.setDate(maxDate.getDate() + 1)

  const expandedStart = minDate.toISOString().split('T')[0]
  const expandedEnd = maxDate.toISOString().split('T')[0]

  // Find overlapping days from OTHER ProjectAssignments
  const overlappingDays = await db
    .select()
    .from(dayAssignments)
    .where(
      and(
        ne(dayAssignments.projectAssignmentId, projectAssignment.id),
        gte(dayAssignments.date, expandedStart),
        lte(dayAssignments.date, expandedEnd)
      )
    )

  if (overlappingDays.length === 0) {
    return
  }

  // Filter to only same project + member
  const relevantOverlaps: typeof overlappingDays = []

  for (const day of overlappingDays) {
    const otherPA = await db.query.projectAssignments.findFirst({
      where: (pa, { eq }) => eq(pa.id, day.projectAssignmentId)
    })

    if (
      otherPA &&
      otherPA.projectId === projectAssignment.projectId &&
      otherPA.teamMemberId === projectAssignment.teamMemberId
    ) {
      relevantOverlaps.push(day)
    }
  }

  if (relevantOverlaps.length === 0) {
    return
  }

  // Get unique ProjectAssignment IDs to merge
  const paIdsToMerge = [...new Set(relevantOverlaps.map(d => d.projectAssignmentId))]

  // For each PA to merge, get ALL its days and transfer them
  for (const paId of paIdsToMerge) {
    const allDaysFromPA = await db
      .select()
      .from(dayAssignments)
      .where(eq(dayAssignments.projectAssignmentId, paId))

    // Delete all days from the other PA
    await db.delete(dayAssignments).where(eq(dayAssignments.projectAssignmentId, paId))

    // Delete all groups from the other PA
    await db.delete(assignmentGroups).where(eq(assignmentGroups.projectAssignmentId, paId))

    // Recreate days under the current PA (will be deduplicated in next step)
    for (const day of allDaysFromPA) {
      await db.insert(dayAssignments).values({
        projectAssignmentId: projectAssignment.id,
        date: day.date,
        comment: day.comment
      })
    }
  }
}

/**
 * Apply group merge logic for all modified dates.
 */
async function mergeGroupsForProjectAssignment(
  projectAssignmentId: number,
  modifiedDates: string[]
): Promise<void> {
  // Sort dates to identify segments
  const sortedDates = [...modifiedDates].sort()

  // Find the start of each discontinuous segment
  const segmentStarts: string[] = []
  if (sortedDates.length > 0) {
    segmentStarts.push(sortedDates[0])

    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1])
      const currDate = new Date(sortedDates[i])
      const dayDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))

      // If gap > 1 day, this is a new segment
      if (dayDiff > 1) {
        segmentStarts.push(sortedDates[i])
      }
    }
  }

  // Run merge logic for each segment start
  for (const segmentStart of segmentStarts) {
    await handleGroupMergeOnDayAdd(projectAssignmentId, segmentStart)
  }

  // Final pass: merge any remaining adjacent groups
  await mergeAdjacentGroups(projectAssignmentId)
}

/**
 * Comprehensive batch merge handler.
 * After creating new day assignments, finds ALL contiguous ranges of day assignments
 * and ensures each range is covered by exactly one group.
 * Groups that touch or overlap the same contiguous range are merged (largest survives).
 * Orphan ranges (no existing group) get a new default group.
 */
export async function handleBatchGroupMerge(
  projectAssignmentId: number
): Promise<void> {
  // Get ALL day assignments for this PA, sorted by date
  const allDays = await db
    .select()
    .from(dayAssignments)
    .where(eq(dayAssignments.projectAssignmentId, projectAssignmentId))

  if (allDays.length === 0) {
    // No days at all - clean up any orphaned groups
    await cleanupOrphanedGroups(projectAssignmentId)
    return
  }

  // Sort by date
  allDays.sort((a, b) => a.date.localeCompare(b.date))

  // Build contiguous ranges from actual day assignments
  const contiguousRanges: { start: string; end: string }[] = []
  let rangeStart = allDays[0].date
  let rangeEnd = allDays[0].date

  for (let i = 1; i < allDays.length; i++) {
    const expectedNext = addDay(rangeEnd)
    if (allDays[i].date === expectedNext) {
      // Contiguous - extend range
      rangeEnd = allDays[i].date
    } else {
      // Gap - save current range and start new one
      contiguousRanges.push({ start: rangeStart, end: rangeEnd })
      rangeStart = allDays[i].date
      rangeEnd = allDays[i].date
    }
  }
  // Don't forget the last range
  contiguousRanges.push({ start: rangeStart, end: rangeEnd })

  // Get all existing groups for this PA
  let groups = await db
    .select()
    .from(assignmentGroups)
    .where(eq(assignmentGroups.projectAssignmentId, projectAssignmentId))

  // For each contiguous range, find all groups that touch or overlap it
  for (const range of contiguousRanges) {
    // A group "touches" the range if:
    // - It overlaps: group.start <= range.end && group.end >= range.start
    // - It's adjacent: group.end === dayBefore(range.start) or group.start === dayAfter(range.end)
    const dayBeforeRange = subtractDay(range.start)
    const dayAfterRange = addDay(range.end)

    const touchingGroups = groups.filter(g =>
      // Overlapping
      (g.startDate <= range.end && g.endDate >= range.start) ||
      // Adjacent before
      g.endDate === dayBeforeRange ||
      // Adjacent after
      g.startDate === dayAfterRange
    )

    if (touchingGroups.length === 0) {
      // No existing group covers this range - create a new default group
      await db.insert(assignmentGroups).values({
        projectAssignmentId,
        startDate: range.start,
        endDate: range.end,
        priority: 'normal',
        comment: null,
      })
    } else if (touchingGroups.length === 1) {
      // One group touches - expand it to cover the full range
      const group = touchingGroups[0]
      const newStart = group.startDate < range.start ? group.startDate : range.start
      const newEnd = group.endDate > range.end ? group.endDate : range.end

      if (newStart !== group.startDate || newEnd !== group.endDate) {
        await db
          .update(assignmentGroups)
          .set({ startDate: newStart, endDate: newEnd })
          .where(eq(assignmentGroups.id, group.id))
      }
    } else {
      // Multiple groups touch this range - merge them all
      // Survivor is the largest group (by day count)
      touchingGroups.sort((a, b) => dayCount(b.startDate, b.endDate) - dayCount(a.startDate, a.endDate))
      const survivor = touchingGroups[0]
      const losers = touchingGroups.slice(1)

      // Calculate the merged range (covers all groups + the contiguous range)
      let mergedStart = range.start
      let mergedEnd = range.end
      for (const g of touchingGroups) {
        if (g.startDate < mergedStart) mergedStart = g.startDate
        if (g.endDate > mergedEnd) mergedEnd = g.endDate
      }

      // Update survivor to span the full merged range
      await db
        .update(assignmentGroups)
        .set({ startDate: mergedStart, endDate: mergedEnd })
        .where(eq(assignmentGroups.id, survivor.id))

      // Delete losers
      for (const loser of losers) {
        await db.delete(assignmentGroups).where(eq(assignmentGroups.id, loser.id))
      }

      // Remove losers from the groups array so they don't match subsequent ranges
      const loserIds = new Set(losers.map(l => l.id))
      groups = groups.filter(g => !loserIds.has(g.id))

      // Update survivor in groups array
      const survivorIdx = groups.findIndex(g => g.id === survivor.id)
      if (survivorIdx >= 0) {
        groups[survivorIdx] = { ...groups[survivorIdx], startDate: mergedStart, endDate: mergedEnd }
      }
    }
  }

  // Final cleanup: remove any groups with no actual day assignments
  await cleanupOrphanedGroups(projectAssignmentId)
}
