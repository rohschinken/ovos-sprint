/**
 * Timeline Constants
 *
 * Centralized constants for timeline zoom levels, widths, and configuration.
 * Extracted from Timeline.tsx for better maintainability and reusability.
 */

/**
 * Pixel widths for each zoom level
 * Used for calculations, measurements, and dynamic width computations
 */
export const ZOOM_PIXEL_WIDTHS = {
  1: 40,  // Extra Narrow
  2: 48,  // Compact
  3: 64,  // Narrow (default)
  4: 80,  // Normal
} as const

/**
 * Tailwind CSS width classes for each zoom level
 * Used for column rendering in the timeline grid
 */
export const ZOOM_COLUMN_WIDTHS = {
  1: 'w-10',  // 40px - Extra Narrow
  2: 'w-12',  // 48px - Compact
  3: 'w-16',  // 64px - Narrow (default)
  4: 'w-20',  // 80px - Normal
} as const

/**
 * Default zoom level
 */
export const DEFAULT_ZOOM_LEVEL = 3

/**
 * Default column width class (fallback)
 */
export const DEFAULT_COLUMN_WIDTH = 'w-16' // 64px

/**
 * Default pixel width (fallback)
 */
export const DEFAULT_PIXEL_WIDTH = 64

/**
 * Sidebar width in pixels (w-64 Tailwind class)
 */
export const SIDEBAR_WIDTH = 256

/**
 * Space reserved for priority indicator at the end of assignment bars
 */
export const PRIORITY_INDICATOR_WIDTH = 24

/**
 * Type for zoom level keys
 * NOTE: Moved to @/components/timeline/types for better organization
 */
export type { ZoomLevel } from '@/components/timeline/types'
