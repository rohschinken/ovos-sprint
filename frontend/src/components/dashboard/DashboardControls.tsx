import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  ZoomIn,
  UnfoldVertical,
  FoldVertical,
  Briefcase,
  UserCircle,
  Minus,
  Plus,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { DashboardControlsProps } from './types'

/**
 * DashboardControls Component
 *
 * Provides control buttons and settings for the dashboard view.
 * Features view mode toggle (by-project/by-member), expand/collapse all button,
 * and zoom level control slider.
 *
 * @param props - Component props
 * @returns The dashboard controls component
 */
export function DashboardControls({
  viewMode,
  onViewModeChange,
  zoomLevel,
  onZoomChange,
  onToggleExpandAll,
  isAllExpanded,
}: DashboardControlsProps) {

  // Zoom level labels
  const zoomLabels = ['Narrow', 'Compact', 'Normal', 'Wide']

  return (
    <div className="flex gap-2 xl:gap-3">
      {/* View Mode Toggle */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className={cn(
          "flex items-center gap-3 px-2 xl:px-4 h-12 rounded-md border bg-background",
          viewMode === 'by-project' ? 'border-mode-project' : 'border-mode-member'
        )}
      >
        <span className="hidden xl:inline text-sm font-medium">By Member</span>
        <div className="relative -bottom-[2px]">
          <Switch
            checked={viewMode === 'by-project'}
            onCheckedChange={(checked) =>
              onViewModeChange(checked ? 'by-project' : 'by-member')
            }
            className={cn(
              "h-7 w-14 [&>span]:hidden",
              viewMode === 'by-member' ? 'bg-mode-member' : 'bg-mode-project'
            )}
          />
          <div className="absolute top-[2px] left-0 flex items-center pointer-events-none">
            <div
              className={cn(
                "h-6 w-6 rounded-full bg-background shadow-sm flex items-center justify-center transition-transform duration-200",
                viewMode === 'by-project' ? 'translate-x-[30px]' : 'translate-x-[2px]'
              )}
            >
              {viewMode === 'by-project' ? (
                <Briefcase className="h-4 w-4 font-color-mode-project" />
              ) : (
                <UserCircle className="h-4 w-4 font-color-mode-member" />
              )}
            </div>
          </div>
        </div>
        <span className="hidden xl:inline text-sm font-medium">By Project</span>
      </motion.div>

      {/* Expand/Collapse All Button */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Button
          variant="outline"
          onClick={onToggleExpandAll}
          className="gap-2 h-12 transition-transform hover:scale-105 active:scale-95"
        >
          {isAllExpanded ? (
            <>
              <FoldVertical className="h-4 w-4" />
              <span className="hidden xl:inline">Collapse All</span>
            </>
          ) : (
            <>
              <UnfoldVertical className="h-4 w-4" />
              <span className="hidden xl:inline">Expand All</span>
            </>
          )}
        </Button>
      </motion.div>

      {/* Zoom Control */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-2 xl:gap-3 px-2 xl:px-4 h-12 rounded-md border bg-background"
      >
        <ZoomIn className="h-4 w-4 text-muted-foreground" />

        {/* Desktop: Show slider + label */}
        <div className="hidden xl:flex items-center gap-3">
          <Slider
            value={[zoomLevel]}
            onValueChange={([value]) => onZoomChange(value)}
            min={1}
            max={4}
            step={1}
            className="w-32"
          />
          <span className="text-sm font-medium w-16">
            {zoomLabels[zoomLevel - 1]}
          </span>
        </div>

        {/* Mobile: Show +/- buttons */}
        <div className="flex xl:hidden items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onZoomChange(Math.max(1, zoomLevel - 1))}
            disabled={zoomLevel === 1}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="text-xs text-muted-foreground w-12 text-center">
            {zoomLabels[zoomLevel - 1]}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onZoomChange(Math.min(4, zoomLevel + 1))}
            disabled={zoomLevel === 4}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
