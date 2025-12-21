import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/client'
import { Team, TeamMember, TeamWithMembers } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2, Users, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { getInitials, getAvatarColor } from '@/lib/utils'
import { AlertDialog } from '@/components/ui/alert-dialog'

export default function TeamsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [managingTeam, setManagingTeam] = useState<Team | null>(null)
  const [teamName, setTeamName] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [removeDialog, setRemoveDialog] = useState<{
    teamId: number
    memberId: number
    memberName: string
  } | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{
    teamId: number
    teamName: string
    cascadeInfo: {
      memberLinks: number
    } | null
  } | null>(null)

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await api.get('/teams')
      return response.data as Team[]
    },
  })

  const { data: allMembers = [] } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const response = await api.get('/members')
      return response.data as TeamMember[]
    },
  })

  const { data: teamDetails } = useQuery({
    queryKey: ['teams', managingTeam?.id],
    queryFn: async () => {
      const response = await api.get(`/teams/${managingTeam?.id}`)
      return response.data as TeamWithMembers
    },
    enabled: !!managingTeam,
  })

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await api.post('/teams', { name })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      setIsCreateOpen(false)
      setTeamName('')
      toast({ title: 'Team created successfully' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const response = await api.put(`/teams/${id}`, { name })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      setEditingTeam(null)
      setTeamName('')
      toast({ title: 'Team updated successfully' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/teams/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      toast({ title: 'Team deleted successfully' })
    },
  })

  const addMemberMutation = useMutation({
    mutationFn: async ({ teamId, memberId }: { teamId: number; memberId: number }) => {
      await api.post(`/teams/${teamId}/members/${memberId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['teams', 'members', 'relationships'] })
      setSelectedMemberId('')
      toast({ title: 'Member added to team' })
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: async ({ teamId, memberId }: { teamId: number; memberId: number }) => {
      await api.delete(`/teams/${teamId}/members/${memberId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['teams', 'members', 'relationships'] })
      toast({ title: 'Member removed from team' })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingTeam) {
      updateMutation.mutate({ id: editingTeam.id, name: teamName })
    } else {
      createMutation.mutate(teamName)
    }
  }

  const handleAddMember = () => {
    if (!managingTeam || !selectedMemberId) return
    addMemberMutation.mutate({
      teamId: managingTeam.id,
      memberId: parseInt(selectedMemberId),
    })
  }

  const handleRemoveMember = (memberId: number, memberName: string) => {
    if (!managingTeam) return
    setRemoveDialog({
      teamId: managingTeam.id,
      memberId,
      memberName,
    })
  }

  const availableMembers = allMembers.filter(
    (member) => !teamDetails?.members?.some((tm) => tm.id === member.id)
  )

  const filteredTeams = teams.filter((team) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return team.name.toLowerCase().includes(query)
  })

  return (
    <div className="container mx-auto">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold">Teams</h1>
          <p className="text-muted-foreground">Manage your teams</p>
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Team
          </Button>
        </motion.div>
      </motion.div>

      <Input
        placeholder="Search teams by name..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-md"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeams.map((team, index) => (
          <motion.div
            key={team.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card>
            <CardHeader>
              <CardTitle>{team.name}</CardTitle>
              <CardDescription>
                Created {new Date(team.createdAt).toLocaleDateString('de-AT')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setManagingTeam(team)}
                    className="gap-2 w-full"
                  >
                    <Users className="h-3 w-3" />
                    Manage Members
                  </Button>
                </motion.div>
                <div className="flex gap-2">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingTeam(team)
                        setTeamName(team.name)
                      }}
                      className="gap-2"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        try {
                          const response = await api.get(`/teams/${team.id}/cascade-info`)
                          setDeleteDialog({
                            teamId: team.id,
                            teamName: team.name,
                            cascadeInfo: response.data,
                          })
                        } catch (error) {
                          setDeleteDialog({
                            teamId: team.id,
                            teamName: team.name,
                            cascadeInfo: null,
                          })
                        }
                      }}
                      className="gap-2"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </motion.div>
                </div>
              </div>
            </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredTeams.length === 0 && teams.length > 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No teams found matching "{searchQuery}".</p>
        </div>
      )}

      {teams.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No teams yet.</p>
          <p className="text-sm mt-2">Click "Create Team" to get started.</p>
        </div>
      )}

      <Dialog
        open={isCreateOpen || !!editingTeam}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false)
            setEditingTeam(null)
            setTeamName('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTeam ? 'Edit Team' : 'Create Team'}
            </DialogTitle>
            <DialogDescription>
              {editingTeam
                ? 'Update the team name'
                : 'Create a new team'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Team Name</Label>
                <Input
                  id="name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">
                {editingTeam ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!managingTeam}
        onOpenChange={(open) => {
          if (!open) {
            setManagingTeam(null)
            setSelectedMemberId('')
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Members - {managingTeam?.name}</DialogTitle>
            <DialogDescription>
              Add or remove members from this team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Current Members */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Current Members</h3>
              <ScrollArea className="h-48 rounded-md border p-4">
                {teamDetails?.members && teamDetails.members.length > 0 ? (
                  <div className="space-y-2">
                    {teamDetails.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatarUrl || undefined} />
                            <AvatarFallback
                              style={{
                                backgroundColor: getAvatarColor(member.firstName, member.lastName).bg,
                                color: getAvatarColor(member.firstName, member.lastName).text,
                              }}
                            >
                              {getInitials(member.firstName, member.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {member.firstName} {member.lastName}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id, `${member.firstName} ${member.lastName}`)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No members in this team yet
                  </p>
                )}
              </ScrollArea>
            </div>

            {/* Add Member */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Add Member</h3>
              <div className="flex gap-2">
                <Select
                  value={selectedMemberId}
                  onValueChange={setSelectedMemberId}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a member" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.length > 0 ? (
                      availableMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={member.avatarUrl || undefined} />
                              <AvatarFallback
                                className="text-xs"
                                style={{
                                  backgroundColor: getAvatarColor(member.firstName, member.lastName).bg,
                                  color: getAvatarColor(member.firstName, member.lastName).text,
                                }}
                              >
                                {getInitials(member.firstName, member.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <span>
                              {member.firstName} {member.lastName}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        All members already assigned
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddMember}
                  disabled={!selectedMemberId || availableMembers.length === 0}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Team Member Confirmation Dialog */}
      <AlertDialog
        open={!!removeDialog}
        onOpenChange={() => setRemoveDialog(null)}
        title="Remove Team Member"
        description="This will remove the member from this team. The member's profile will not be deleted."
        entityName={removeDialog?.memberName}
        confirmLabel="Remove Member"
        onConfirm={() => {
          if (removeDialog) {
            removeMemberMutation.mutate({
              teamId: removeDialog.teamId,
              memberId: removeDialog.memberId,
            })
            setRemoveDialog(null)
          }
        }}
        isLoading={removeMemberMutation.isPending}
      />

      {/* Delete Team Confirmation Dialog */}
      <AlertDialog
        open={!!deleteDialog}
        onOpenChange={() => setDeleteDialog(null)}
        title="Delete Team"
        description="This will permanently delete the team. This action cannot be undone."
        entityName={deleteDialog?.teamName}
        cascadeWarning={deleteDialog?.cascadeInfo ? {
          items: [
            { type: 'team member links', count: deleteDialog.cascadeInfo.memberLinks },
          ].filter(item => item.count > 0)
        } : undefined}
        confirmLabel="Delete Team"
        onConfirm={() => {
          if (deleteDialog) {
            deleteMutation.mutate(deleteDialog.teamId)
            setDeleteDialog(null)
          }
        }}
        isLoading={deleteMutation.isPending}
      />
    </motion.div>
    </div>
  )
}
