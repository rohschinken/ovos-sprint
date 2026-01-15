/**
 * Timeline Styling Utilities
 *
 * Pure functions for calculating CSS classes for timeline assignment bars.
 * These functions determine rounded corners, borders, and widths based on
 * whether adjacent cells have assignments (for seamless visual connections).
 */

/**
 * Get rounded corner classes for expanded assignment bars
 * @param hasPrev - Whether the previous day has this assignment
 * @param hasNext - Whether the next day has this assignment
 * @returns Tailwind rounded class
 */
export function getAssignmentRoundedClass(hasPrev: boolean, hasNext: boolean): string {
  if (!hasPrev && !hasNext) return 'rounded' // Single day
  if (!hasPrev && hasNext) return 'rounded-l' // First day
  if (hasPrev && hasNext) return 'rounded-none' // Middle day
  if (hasPrev && !hasNext) return 'rounded-r' // Last day
  return 'rounded'
}

/**
 * Get border classes for expanded assignment bars
 * Always show top/bottom borders, only show left/right on edges
 * @param hasPrev - Whether the previous day has this assignment
 * @param hasNext - Whether the next day has this assignment
 * @returns Tailwind border classes as space-separated string
 */
export function getAssignmentBorderClass(hasPrev: boolean, hasNext: boolean): string {
  const classes = ['border-t-2', 'border-b-2']
  if (!hasPrev) classes.push('border-l-2')
  if (!hasNext) classes.push('border-r-2')
  return classes.join(' ')
}

/**
 * Get width class for expanded assignment bars
 * Extend width by 1px when adjacent to next cell for seamless connection
 * @param hasNext - Whether the next day has this assignment
 * @returns Tailwind width class
 */
export function getAssignmentWidthClass(hasNext: boolean): string {
  if (hasNext) return 'w-[calc(100%+1px)]'
  return 'w-full'
}

/**
 * Get rounded corner classes for collapsed assignment bars
 * @param hasPrev - Whether the previous day has this assignment
 * @param hasNext - Whether the next day has this assignment
 * @returns Tailwind rounded class
 */
export function getCollapsedBarRoundedClass(hasPrev: boolean, hasNext: boolean): string {
  if (!hasPrev && !hasNext) return 'rounded' // Single day
  if (!hasPrev && hasNext) return 'rounded-l' // First day
  if (hasPrev && hasNext) return 'rounded-none' // Middle day
  if (hasPrev && !hasNext) return 'rounded-r' // Last day
  return 'rounded'
}

/**
 * Get border classes for collapsed assignment bars
 * Always show top/bottom borders, only show left/right on edges
 * @param hasPrev - Whether the previous day has this assignment
 * @param hasNext - Whether the next day has this assignment
 * @returns Tailwind border classes as space-separated string
 */
export function getCollapsedBarBorderClass(hasPrev: boolean, hasNext: boolean): string {
  const classes = ['border-t-2', 'border-b-2']
  if (!hasPrev) classes.push('border-l-2')
  if (!hasNext) classes.push('border-r-2')
  return classes.join(' ')
}

/**
 * Get width class for collapsed assignment bars
 * Extend width by 1px when adjacent to next cell for seamless connection
 * @param hasNext - Whether the next day has this assignment
 * @returns Tailwind width class
 */
export function getCollapsedBarWidthClass(hasNext: boolean): string {
  if (hasNext) return 'w-[calc(100%+1px)]'
  return 'w-full'
}
