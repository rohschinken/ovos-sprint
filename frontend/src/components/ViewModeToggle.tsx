import { LayoutGrid, List } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { ViewModeToggleProps } from './types'

export function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
  return (
    <div className="flex items-center gap-2 px-3 h-9 rounded-md border bg-background">
      <LayoutGrid
        className={cn(
          'h-4 w-4 transition-colors',
          viewMode === 'cards' ? 'text-primary' : 'text-muted-foreground'
        )}
      />
      <Switch
        checked={viewMode === 'list'}
        onCheckedChange={(checked) => onViewModeChange(checked ? 'list' : 'cards')}
        className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-primary"
      />
      <List
        className={cn(
          'h-4 w-4 transition-colors',
          viewMode === 'list' ? 'text-primary' : 'text-muted-foreground'
        )}
      />
    </div>
  )
}
