import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/client'
import type { TeamMember, ProjectAssignmentWithDetails } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar'
import { Checkbox } from './ui/checkbox'
import { ScrollArea } from './ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { getInitials, cn } from '@/lib/utils'
import { UserPlus, X } from 'lucide-react'
import type { AssignMemberDialogProps } from './types'

export default function AssignMemberDialog({
  project,
  open,
  onOpenChange,
}: AssignMemberDialogProps) {
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([])
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const response = await api.get('/members')
      return response.data as TeamMember[]
    },
  })

  const { data: projectAssignments = [] } = useQuery<ProjectAssignmentWithDetails[]>({
    queryKey: ['assignments', 'projects', project.id],
    queryFn: async () => {
      const response = await api.get(`/assignments/projects/${project.id}`)
      return response.data as ProjectAssignmentWithDetails[]
    },
  })

  const assignedMemberIds = new Set(
    projectAssignments.map((pa) => pa.teamMemberId)
  )

  const assignMutation = useMutation({
    mutationFn: async (memberId: number) => {
      const response = await api.post('/assignments/projects', {
        projectId: project.id,
        teamMemberId: memberId,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      toast({ title: 'Member assigned to project' })
    },
  })

  const unassignMutation = useMutation({
    mutationFn: async (assignmentId: number) => {
      await api.delete(`/assignments/projects/${assignmentId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      toast({ title: 'Member unassigned from project' })
    },
  })

  const batchAssignMutation = useMutation({
    mutationFn: async (memberIds: number[]) => {
      const response = await api.post('/assignments/projects/batch', {
        projectId: project.id,
        memberIds
      })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      toast({
        title: 'Success',
        description: `Assigned ${data.added} member(s)${data.skipped > 0 ? `, ${data.skipped} already assigned` : ''}`,
      })
      setSelectedMemberIds([])
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to assign members',
        variant: 'destructive',
      })
    },
  })

  const handleToggleAssignment = (member: TeamMember) => {
    const assignment = projectAssignments.find(
      (pa) => pa.teamMemberId === member.id
    )

    if (assignment) {
      unassignMutation.mutate(assignment.id)
    } else {
      assignMutation.mutate(member.id)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Assign Members to {project.name}</DialogTitle>
              <DialogDescription>
                Select team members to assign to this project. You can then create
                day-specific assignments in the timeline.
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMultiSelectMode(!multiSelectMode)
                setSelectedMemberIds([])
              }}
            >
              {multiSelectMode ? 'Single Select' : 'Multi-Select'}
            </Button>
          </div>
        </DialogHeader>

        {multiSelectMode ? (
          <div className="space-y-4">
            <ScrollArea className="h-96">
              <div className="grid grid-cols-1 gap-2 p-1">
                {members.map((member) => {
                  const isAssigned = assignedMemberIds.has(member.id)
                  return (
                    <div
                      key={member.id}
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-md border cursor-pointer transition-colors",
                        selectedMemberIds.includes(member.id) && "bg-accent border-primary"
                      )}
                      onClick={() => {
                        if (isAssigned) return // Can't select already assigned in multi-mode
                        setSelectedMemberIds(prev =>
                          prev.includes(member.id)
                            ? prev.filter(id => id !== member.id)
                            : [...prev, member.id]
                        )
                      }}
                    >
                      <Checkbox
                        checked={selectedMemberIds.includes(member.id)}
                        disabled={isAssigned}
                      />
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatarUrl || undefined} />
                        <AvatarFallback>
                          {getInitials(member.firstName, member.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">
                          {member.firstName} {member.lastName}
                        </p>
                        {isAssigned && (
                          <p className="text-xs text-muted-foreground">Already assigned</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  const unassignedIds = members
                    .filter(m => !assignedMemberIds.has(m.id))
                    .map(m => m.id)
                  setSelectedMemberIds(unassignedIds)
                }}
              >
                Select All Unassigned
              </Button>
              <Button
                onClick={() => {
                  if (selectedMemberIds.length > 0) {
                    batchAssignMutation.mutate(selectedMemberIds)
                  }
                }}
                disabled={selectedMemberIds.length === 0 || batchAssignMutation.isPending}
              >
                Assign Selected ({selectedMemberIds.length})
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
            {members.map((member) => {
              const isAssigned = assignedMemberIds.has(member.id)

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.avatarUrl || undefined} />
                      <AvatarFallback>
                        {getInitials(member.firstName, member.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {member.firstName} {member.lastName}
                    </span>
                  </div>

                  <Button
                    variant={isAssigned ? 'destructive' : 'default'}
                    size="sm"
                    onClick={() => handleToggleAssignment(member)}
                    className="gap-2"
                  >
                    {isAssigned ? (
                      <>
                        <X className="h-4 w-4" />
                        Remove
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Assign
                      </>
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
