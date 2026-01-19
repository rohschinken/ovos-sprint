import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Filter } from 'lucide-react'
import { motion } from 'framer-motion'
import { TeamFilterPopoverProps } from './types'

/**
 * TeamFilterPopover Component
 *
 * Provides a popover interface for filtering the dashboard by teams.
 * Features team selection checkboxes with quick actions for selecting all,
 * clearing selections, and selecting only the current user's teams.
 *
 * @param props - Component props
 * @returns The team filter popover component
 */
export function TeamFilterPopover({
  teams,
  selectedTeamIds,
  currentUserTeams,
  onToggleTeam,
  onClearFilter,
  onSelectAll,
  onSelectMyTeams,
}: TeamFilterPopoverProps) {
  // Find current user's teams for "My Teams" section
  const myTeams = currentUserTeams
    ? teams.filter(t => currentUserTeams.includes(t.id))
    : []
  const hasMyTeams = myTeams.length > 0

  return (
    <Popover>
      <PopoverTrigger asChild>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button variant="outline" className="gap-2 h-12">
            <Filter className="h-4 w-4" />
            Teams
            {selectedTeamIds.length > 0 && (
              <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {selectedTeamIds.length}
              </span>
            )}
          </Button>
        </motion.div>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Filter by Team</h4>
            <div className="flex gap-1">
              {hasMyTeams && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSelectMyTeams}
                  className="h-7 text-xs"
                >
                  Mine
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onSelectAll}
                className="h-7 text-xs"
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilter}
                className="h-7 text-xs"
              >
                Clear
              </Button>
            </div>
          </div>
          {hasMyTeams && (
            <>
              <div className="text-xs text-muted-foreground font-medium">My Teams</div>
              <div className="space-y-2">
                {myTeams.map((team) => (
                  <div key={team.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`my-team-${team.id}`}
                      checked={selectedTeamIds.includes(team.id)}
                      onCheckedChange={() => onToggleTeam(team.id)}
                    />
                    <Label
                      htmlFor={`my-team-${team.id}`}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {team.name}
                    </Label>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2">
                <div className="text-xs text-muted-foreground font-medium mb-2">All Teams</div>
              </div>
            </>
          )}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {teams.map((team) => (
              <div key={team.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`team-${team.id}`}
                  checked={selectedTeamIds.includes(team.id)}
                  onCheckedChange={() => onToggleTeam(team.id)}
                />
                <Label
                  htmlFor={`team-${team.id}`}
                  className="text-sm font-normal cursor-pointer flex-1"
                >
                  {team.name}
                </Label>
              </div>
            ))}
            {teams.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No teams available
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
