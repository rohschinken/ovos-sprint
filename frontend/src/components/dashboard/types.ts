import { Dispatch, SetStateAction } from 'react'
import { Team, TimelineViewMode } from '@/types'

/**
 * Dashboard Component Props
 */

/**
 * Props for the DashboardControls component
 */
export interface DashboardControlsProps {
  /** Current view mode (by-project or by-member) */
  viewMode: TimelineViewMode
  /** Callback when view mode changes */
  onViewModeChange: (mode: TimelineViewMode) => void
  /** Current zoom level (1-4) */
  zoomLevel: number
  /** Callback when zoom level changes */
  onZoomChange: (level: number) => void
  /** Callback to toggle expand/collapse all items */
  onToggleExpandAll: () => void
  /** Number of currently expanded items */
  expandedItemsCount: number
  /** Total number of expandable items */
  totalItemsCount: number
}

/**
 * Props for the DisplaySettingsPopover component
 */
export interface DisplaySettingsPopoverProps {
  /** Whether to show tentative projects */
  showTentative: boolean
  /** Whether to show weekends in the timeline */
  showWeekends: boolean
  /** Whether to show overlap indicators */
  showOverlaps: boolean
  /** Whether to hide empty rows in the timeline */
  hideEmptyRows: boolean
  /** Whether to warn about weekend assignments */
  warnWeekends: boolean
  /** Number of previous days to show in timeline */
  prevDays: number
  /** Number of next days to show in timeline */
  nextDays: number
  /** Current user's role */
  currentUserRole?: string
  /** Callback when a setting value changes */
  onSettingChange: (key: string, value: any) => void
}

/**
 * Props for the TeamFilterPopover component
 */
export interface TeamFilterPopoverProps {
  /** List of all available teams */
  teams: Team[]
  /** Array of currently selected team IDs */
  selectedTeamIds: number[]
  /** Current user's team IDs for determining "My Teams" section */
  currentUserTeams?: number[]
  /** Callback when a team checkbox is toggled */
  onToggleTeam: (id: number) => void
  /** Callback to clear all team filters */
  onClearFilter: () => void
  /** Callback to select all teams */
  onSelectAll: () => void
  /** Callback to select only the current user's teams */
  onSelectMyTeams: () => void
}

/**
 * Dashboard Hook Types
 */

/**
 * Parameters for the settings mutation
 */
export interface SettingUpdateData {
  key: string
  value: string
}

/**
 * Return type for the useDashboardSettings hook
 */
export interface UseDashboardSettingsReturn {
  /** Whether to warn about weekend assignments */
  warnWeekends: boolean
  /** Setter for warnWeekends state */
  setWarnWeekends: Dispatch<SetStateAction<boolean>>
  /** Function to update any setting in the backend */
  handleSettingChange: (key: string, value: boolean | string) => void
  /** Whether a setting update is in progress */
  isUpdating: boolean
}

/**
 * Parameters for the useDashboardSettings hook
 */
export interface UseDashboardSettingsParams {
  /** Backend settings containing configuration */
  settings: Record<string, string>
}

/**
 * Parameters for the useDashboardPreferences hook
 */
export interface UseDashboardPreferencesParams {
  /** User ID for localStorage key generation */
  userId?: number
  /** Backend settings containing timeline configuration */
  settings: Record<string, string>
}

/**
 * Return type for the useDashboardPreferences hook
 */
export interface UseDashboardPreferencesReturn {
  // View preferences
  viewMode: TimelineViewMode
  setViewMode: Dispatch<SetStateAction<TimelineViewMode>>
  selectedTeamIds: number[]
  setSelectedTeamIds: Dispatch<SetStateAction<number[]>>
  zoomLevel: number
  setZoomLevel: Dispatch<SetStateAction<number>>
  expandedItems: number[]
  setExpandedItems: Dispatch<SetStateAction<number[]>>

  // Display settings
  showTentative: boolean
  setShowTentative: Dispatch<SetStateAction<boolean>>
  showWeekends: boolean
  setShowWeekends: Dispatch<SetStateAction<boolean>>
  showOverlaps: boolean
  setShowOverlaps: Dispatch<SetStateAction<boolean>>
  hideEmptyRows: boolean
  setHideEmptyRows: Dispatch<SetStateAction<boolean>>

  // Date range from backend settings
  prevDays: number
  setPrevDays: Dispatch<SetStateAction<number>>
  nextDays: number
  setNextDays: Dispatch<SetStateAction<number>>

  // Status
  prefsLoaded: boolean
}
