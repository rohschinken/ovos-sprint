import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Eye } from 'lucide-react'
import { motion } from 'framer-motion'
import { DisplaySettingsPopoverProps } from './types'

/**
 * DisplaySettingsPopover Component
 *
 * Provides a popover interface for adjusting dashboard display settings.
 * Features checkboxes for display options, warnings, and timeline range controls
 * for admin and project manager users.
 *
 * @param props - Component props
 * @returns The display settings popover component
 */
export function DisplaySettingsPopover({
  showTentative,
  showWeekends,
  showOverlaps,
  hideEmptyRows,
  warnWeekends,
  prevDays,
  nextDays,
  currentUserRole,
  onSettingChange,
}: DisplaySettingsPopoverProps) {
  const canEditTimeline = currentUserRole === 'admin' || currentUserRole === 'project_manager'

  // Helper function to clamp values to valid range
  const clampValue = (val: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, val))
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button variant="outline" className="gap-2 h-12">
            <Eye className="h-4 w-4" />
            <span className="hidden xl:inline">Display</span>
          </Button>
        </motion.div>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Display Settings</h4>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-tentative"
                checked={showTentative}
                onCheckedChange={(checked) => onSettingChange('showTentative', !!checked)}
              />
              <Label
                htmlFor="show-tentative"
                className="text-sm font-normal cursor-pointer flex-1"
              >
                Show Tentative Projects
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-weekends"
                checked={showWeekends}
                onCheckedChange={(checked) => onSettingChange('showWeekends', !!checked)}
              />
              <Label
                htmlFor="show-weekends"
                className="text-sm font-normal cursor-pointer flex-1"
              >
                Show Weekends
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-overlaps"
                checked={showOverlaps}
                onCheckedChange={(checked) => onSettingChange('showOverlaps', !!checked)}
              />
              <Label
                htmlFor="show-overlaps"
                className="text-sm font-normal cursor-pointer flex-1"
              >
                Show Overlap Indicators
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hide-empty-rows"
                checked={hideEmptyRows}
                onCheckedChange={(checked) => onSettingChange('hideEmptyRows', !!checked)}
              />
              <Label
                htmlFor="hide-empty-rows"
                className="text-sm font-normal cursor-pointer flex-1"
              >
                Hide Empty Rows
              </Label>
            </div>
            {canEditTimeline && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="warn-weekends"
                  checked={warnWeekends}
                  onCheckedChange={(checked) => onSettingChange('warnWeekends', !!checked)}
                />
                <Label
                  htmlFor="warn-weekends"
                  className="text-sm font-normal cursor-pointer flex-1"
                >
                  Non-Working Day Warning
                </Label>
              </div>
            )}
            <div className="space-y-2 pt-2 border-t">
              <div className="space-y-1">
                <Label htmlFor="prev-days" className="text-sm font-normal">
                  Previous Days
                </Label>
                <Input
                  id="prev-days"
                  type="number"
                  min="0"
                  max="999"
                  value={prevDays}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    if (!isNaN(val)) {
                      const clamped = clampValue(val, 0, 999)
                      onSettingChange('prevDays', clamped)
                    }
                  }}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value) || 0
                    const clamped = clampValue(val, 0, 999)
                    if (val !== clamped) {
                      onSettingChange('prevDays', clamped)
                    }
                  }}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="next-days" className="text-sm font-normal">
                  Next Days
                </Label>
                <Input
                  id="next-days"
                  type="number"
                  min="0"
                  max="999"
                  value={nextDays}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    if (!isNaN(val)) {
                      const clamped = clampValue(val, 0, 999)
                      onSettingChange('nextDays', clamped)
                    }
                  }}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value) || 0
                    const clamped = clampValue(val, 0, 999)
                    if (val !== clamped) {
                      onSettingChange('nextDays', clamped)
                    }
                  }}
                  className="h-8"
                />
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
