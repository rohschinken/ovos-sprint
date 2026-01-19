import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/client'
import {
  SettingUpdateData,
  UseDashboardSettingsReturn,
  UseDashboardSettingsParams,
} from '@/components/dashboard/types'

/**
 * Custom hook for managing dashboard settings with backend persistence.
 *
 * This hook handles:
 * - Managing the warnWeekends setting state
 * - Syncing settings with backend values
 * - Providing a mutation for updating settings
 * - Invalidating the settings cache after updates
 *
 * @param params - Hook parameters including backend settings
 * @returns Dashboard settings state and update handlers
 *
 * @example
 * ```tsx
 * const {
 *   warnWeekends,
 *   handleSettingChange,
 *   isUpdating
 * } = useDashboardSettings({ settings })
 *
 * // Update a setting
 * handleSettingChange('warnWeekendAssignments', true)
 * ```
 */
export function useDashboardSettings({
  settings,
}: UseDashboardSettingsParams): UseDashboardSettingsReturn {
  const [warnWeekends, setWarnWeekends] = useState(true) // default: warn
  const queryClient = useQueryClient()

  // Sync warnWeekends with backend settings
  useEffect(() => {
    if (settings.warnWeekendAssignments !== undefined) {
      setWarnWeekends(settings.warnWeekendAssignments !== 'false')
    }
  }, [settings])

  // Mutation for updating settings in the backend
  const updateSettingMutation = useMutation({
    mutationFn: async (data: SettingUpdateData) => {
      await api.put(`/settings/${data.key}`, { value: data.value })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })

  /**
   * Updates a setting in the backend and invalidates the cache.
   *
   * @param key - The setting key to update
   * @param value - The new value (boolean or string)
   */
  const handleSettingChange = (key: string, value: boolean | string) => {
    updateSettingMutation.mutate({
      key,
      value: typeof value === 'boolean' ? value.toString() : value,
    })
  }

  return {
    warnWeekends,
    setWarnWeekends,
    handleSettingChange,
    isUpdating: updateSettingMutation.isPending,
  }
}
