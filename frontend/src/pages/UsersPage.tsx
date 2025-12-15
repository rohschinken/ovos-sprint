import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { UserPlus, Copy, CheckCircle2, Clock, Mail } from 'lucide-react'

interface Invitation {
  id: number
  email: string
  token: string
  expiresAt: string
  usedAt: string | null
  createdAt: string
}

interface User {
  id: number
  email: string
  role: string
  createdAt: string
}

export default function UsersPage() {
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [invitationLink, setInvitationLink] = useState<string | null>(null)

  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch users - we'll need to add this endpoint
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const response = await api.get('/users')
        return response.data as User[]
      } catch (error) {
        return []
      }
    },
  })

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await api.post('/auth/invite', { email })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
      setInvitationLink(data.invitationLink)
      toast({
        title: 'Invitation created!',
        description: 'The invitation link has been generated. Copy it and send it to the user.',
      })
      setEmail('')
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create invitation',
        description: error.response?.data?.error || 'Something went wrong',
        variant: 'destructive',
      })
    },
  })

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    inviteMutation.mutate(email)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied to clipboard!' })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Invite and manage users</p>
        </div>
        <Button onClick={() => setIsInviteOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite User
        </Button>
      </div>

      {/* Existing Users */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Users</CardTitle>
          <CardDescription>
            Users who have completed their registration
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No users yet. Invite users to get started!
            </p>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{user.email}</div>
                    <div className="text-sm text-muted-foreground">
                      Role: {user.role} · Joined{' '}
                      {new Date(user.createdAt).toLocaleDateString('de-AT')}
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {user.role}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>
              Enter the email address of the user you want to invite. They will
              receive a registration link.
            </DialogDescription>
          </DialogHeader>

          {!invitationLink ? (
            <form onSubmit={handleInvite}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsInviteOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? 'Creating...' : 'Create Invitation'}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900 mb-1">
                      Invitation Link Created
                    </h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Copy this link and send it to the user via email. The
                      link expires in 7 days.
                    </p>
                    <div className="bg-white rounded border border-blue-300 p-3 mb-3">
                      <code className="text-xs break-all">
                        {invitationLink}
                      </code>
                    </div>
                    <Button
                      onClick={() => copyToClipboard(invitationLink)}
                      className="gap-2"
                      size="sm"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Link
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Email functionality is currently in
                  development. Please manually copy and send this link to the
                  user.
                </p>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => {
                    setIsInviteOpen(false)
                    setInvitationLink(null)
                    setEmail('')
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
