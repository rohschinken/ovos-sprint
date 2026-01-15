import { useState, useEffect, Dispatch, SetStateAction } from 'react'
import { TimelineViewMode } from '@/types'

/**
 * Parameters for the useDashboardPreferences hook
 */
interface UseDashboardPreferencesParams {
  /** User ID for localStorage key generation */
  userId?: number
  /** Backend settings containing timeline configuration */
  settings: Record<string, string>
}

/**
 * Return type for the useDashboardPreferences hook
 */
interface UseDashboardPreferencesReturn {
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

  // Date range from backend settings
  prevDays: number
  setPrevDays: Dispatch<SetStateAction<number>>
  nextDays: number
  setNextDays: Dispatch<SetStateAction<number>>

  // Status
  prefsLoaded: boolean
}

/**
 * Custom hook for managing dashboard preferences with localStorage persistence.
 *
 * This hook handles:
 * - Loading user preferences from localStorage on mount
 * - Saving preferences to localStorage when they change
 * - Extracting timeline date range settings from backend settings
 * - Managing view mode, team filters, zoom level, and display options
 *
 * @param params - Hook parameters including userId and backend settings
 * @returns Dashboard preference state and setters
 *
 * @example
 * ```tsx
 * const {
 *   viewMode,
 *   setViewMode,
 *   selectedTeamIds,
 *   prefsLoaded
 * } = useDashboardPreferences({ userId: user?.id, settings })
 * ```
 */
export function useDashboardPreferences({
  userId,
  settings,
}: UseDashboardPreferencesParams): UseDashboardPreferencesReturn {
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  const [viewMode, setViewMode] = useState<TimelineViewMode>('by-member')
  const [prevDays, setPrevDays] = useState(1)
  const [nextDays, setNextDays] = useState(30)
  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>([])
  const [zoomLevel, setZoomLevel] = useState(2) // 1-4, default 2 (narrow)
  const [expandedItems, setExpandedItems] = useState<number[]>([])
  const [showTentative, setShowTentative] = useState(true) // default: shown
  const [showWeekends, setShowWeekends] = useState(true) // default: shown
  const [showOverlaps, setShowOverlaps] = useState(true) // default: shown

  // Load user preferences from localStorage on mount
  useEffect(() => {
    if (!userId || prefsLoaded) return

    const prefsKey = `dashboard-prefs-${userId}`
    const savedPrefs = localStorage.getItem(prefsKey)
    if (savedPrefs) {
      try {
        const prefs = JSON.parse(savedPrefs)
        if (prefs.viewMode) setViewMode(prefs.viewMode)
        if (prefs.selectedTeamIds) setSelectedTeamIds(prefs.selectedTeamIds)
        if (prefs.zoomLevel) setZoomLevel(prefs.zoomLevel)
        if (prefs.expandedItems !== undefined) setExpandedItems(prefs.expandedItems)
        if (prefs.showTentative !== undefined) setShowTentative(prefs.showTentative)
        if (prefs.showWeekends !== undefined) setShowWeekends(prefs.showWeekends)
        if (prefs.showOverlaps !== undefined) setShowOverlaps(prefs.showOverlaps)
      } catch (error) {
        console.error('Failed to load dashboard preferences:', error)
      }
    }
    setPrefsLoaded(true)
  }, [userId, prefsLoaded])

  // Save user preferences to localStorage (only after initial load)
  useEffect(() => {
    if (!userId || !prefsLoaded) return

    const prefsKey = `dashboard-prefs-${userId}`
    const prefs = {
      viewMode,
      selectedTeamIds,
      zoomLevel,
      expandedItems,
      showTentative,
      showWeekends,
      showOverlaps,
    }
    localStorage.setItem(prefsKey, JSON.stringify(prefs))
  }, [userId, prefsLoaded, viewMode, selectedTeamIds, zoomLevel, expandedItems, showTentative, showWeekends, showOverlaps])

  // Extract date range and display settings from backend settings
  useEffect(() => {
    if (settings.timelinePrevDays) {
      setPrevDays(parseInt(settings.timelinePrevDays))
    }
    if (settings.timelineNextDays) {
      setNextDays(parseInt(settings.timelineNextDays))
    }
    if (settings.showOverlapVisualization !== undefined) {
      setShowOverlaps(settings.showOverlapVisualization !== 'false')
    }
  }, [settings])

  return {
    // View preferences
    viewMode,
    setViewMode,
    selectedTeamIds,
    setSelectedTeamIds,
    zoomLevel,
    setZoomLevel,
    expandedItems,
    setExpandedItems,

    // Display settings
    showTentative,
    setShowTentative,
    showWeekends,
    setShowWeekends,
    showOverlaps,
    setShowOverlaps,

    // Date range
    prevDays,
    setPrevDays,
    nextDays,
    setNextDays,

    // Status
    prefsLoaded,
  }
}
