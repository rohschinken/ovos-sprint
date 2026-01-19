
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
import { useToast } from '@/hooks/use-toast'
import { getInitials } from '@/lib/utils'
import { UserPlus, X } from 'lucide-react'
import type { AssignMemberDialogProps } from './types'

export default function AssignMemberDialog({
  project,
  open,
  onOpenChange,
}: AssignMemberDialogProps) {
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

  const assignedMemberIds = projectAssignments.map(
    (pa) => pa.teamMemberId
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
          <DialogTitle>Assign Members to {project.name}</DialogTitle>
          <DialogDescription>
            Select team members to assign to this project. You can then create
            day-specific assignments in the timeline.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
          {members.map((member) => {
            const isAssigned = assignedMemberIds.includes(member.id)

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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
