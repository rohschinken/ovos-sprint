import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
import { useAuthStore } from '@/store/auth'
import { UserPlus, Copy, CheckCircle2, Clock, Mail, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'

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
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const [invitationLink, setInvitationLink] = useState<string | null>(null)

  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuthStore()

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
    mutationFn: async (data: { email: string; role: 'user' | 'admin' }) => {
      const response = await api.post('/auth/invite', data)
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
      setRole('user')
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create invitation',
        description: error.response?.data?.error || 'Something went wrong',
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      await api.delete(`/users/${userId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({
        title: 'User deleted',
        description: 'The user has been removed successfully.',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete user',
        description: error.response?.data?.error || 'Something went wrong',
        variant: 'destructive',
      })
    },
  })

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    inviteMutation.mutate({ email, role })
  }

  const handleDeleteUser = (user: User) => {
    if (window.confirm(`Are you sure you want to delete ${user.email}?`)) {
      deleteMutation.mutate(user.id)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied to clipboard!' })
  }

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
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Invite and manage users</p>
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button onClick={() => setIsInviteOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Invite User
          </Button>
        </motion.div>
      </motion.div>

      {/* Existing Users */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
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
              {users.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  whileHover={{ scale: 1.01, x: 4 }}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{user.email}</div>
                    <div className="text-sm text-muted-foreground">
                      Role: {user.role} · Joined{' '}
                      {new Date(user.createdAt).toLocaleDateString('de-AT')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {user.role}
                    </div>
                    {currentUser?.id !== user.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteUser(user)}
                        disabled={deleteMutation.isPending}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
        </Card>
      </motion.div>

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
                <div className="space-y-2">
                  <Label>Role</Label>
                  <RadioGroup value={role} onValueChange={(value) => setRole(value as 'user' | 'admin')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="user" id="role-user" />
                      <Label htmlFor="role-user" className="font-normal cursor-pointer">
                        User - Can view and interact with the timeline
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="admin" id="role-admin" />
                      <Label htmlFor="role-admin" className="font-normal cursor-pointer">
                        Admin - Full access including user management
                      </Label>
                    </div>
                  </RadioGroup>
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
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={() => copyToClipboard(invitationLink)}
                        className="gap-2"
                        size="sm"
                      >
                        <Copy className="h-4 w-4" />
                        Copy Link
                      </Button>
                    </motion.div>
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
    </motion.div>
    </div>
  )
}
