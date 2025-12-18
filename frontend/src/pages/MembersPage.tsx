import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/client'
import { TeamMember } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
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
import { Plus, Pencil, Trash2, Upload, Camera } from 'lucide-react'
import { getInitials, generateAvatarUrl, getAvatarColor } from '@/lib/utils'
import { motion } from 'framer-motion'

export default function MembersPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [uploadingAvatarFor, setUploadingAvatarFor] = useState<TeamMember | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const response = await api.get('/members')
      return response.data as TeamMember[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string }) => {
      const avatarUrl = generateAvatarUrl(data.firstName, data.lastName)
      const response = await api.post('/members', { ...data, avatarUrl })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      setIsCreateOpen(false)
      resetForm()
      toast({ title: 'Team member created successfully' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: number
      firstName: string
      lastName: string
    }) => {
      const response = await api.put(`/members/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      setEditingMember(null)
      resetForm()
      toast({ title: 'Team member updated successfully' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/members/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      toast({ title: 'Team member deleted successfully' })
    },
  })

  const uploadAvatarMutation = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData()
      formData.append('avatar', file)
      const response = await api.post(`/members/${id}/avatar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      setUploadingAvatarFor(null)
      setSelectedFile(null)
      setPreviewUrl(null)
      toast({ title: 'Avatar uploaded successfully' })
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to upload avatar',
        description: error.response?.data?.error || 'Something went wrong',
        variant: 'destructive',
      })
    },
  })

  const resetForm = () => {
    setFirstName('')
    setLastName('')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUploadAvatar = () => {
    if (!uploadingAvatarFor || !selectedFile) return
    uploadAvatarMutation.mutate({
      id: uploadingAvatarFor.id,
      file: selectedFile,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingMember) {
      updateMutation.mutate({
        id: editingMember.id,
        firstName,
        lastName,
      })
    } else {
      createMutation.mutate({ firstName, lastName })
    }
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
          <h1 className="text-3xl font-bold">Team Members</h1>
          <p className="text-muted-foreground">Manage your team members</p>
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Member
          </Button>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member, index) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            whileHover={{ scale: 1.02 }}
          >
            <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
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
                <div>
                  <CardTitle>
                    {member.firstName} {member.lastName}
                  </CardTitle>
                  <CardDescription>
                    Added{' '}
                    {new Date(member.createdAt).toLocaleDateString('de-AT')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setUploadingAvatarFor(member)}
                    className="gap-2 w-full"
                  >
                    <Camera className="h-3 w-3" />
                    Upload Avatar
                  </Button>
                </motion.div>
                <div className="flex gap-2">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingMember(member)
                        setFirstName(member.firstName)
                        setLastName(member.lastName)
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
                      onClick={() => deleteMutation.mutate(member.id)}
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

      <Dialog
        open={isCreateOpen || !!editingMember}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false)
            setEditingMember(null)
            resetForm()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMember ? 'Edit Member' : 'Add Team Member'}
            </DialogTitle>
            <DialogDescription>
              {editingMember
                ? 'Update the team member details'
                : 'Add a new team member'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">
                {editingMember ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Avatar Upload Dialog */}
      <Dialog
        open={!!uploadingAvatarFor}
        onOpenChange={(open) => {
          if (!open) {
            setUploadingAvatarFor(null)
            setSelectedFile(null)
            setPreviewUrl(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Avatar</DialogTitle>
            <DialogDescription>
              Upload a profile picture for {uploadingAvatarFor?.firstName}{' '}
              {uploadingAvatarFor?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Current Avatar */}
            <div className="flex justify-center">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  src={
                    previewUrl ||
                    uploadingAvatarFor?.avatarUrl ||
                    undefined
                  }
                />
                <AvatarFallback
                  style={
                    uploadingAvatarFor
                      ? {
                          backgroundColor: getAvatarColor(
                            uploadingAvatarFor.firstName,
                            uploadingAvatarFor.lastName
                          ).bg,
                          color: getAvatarColor(
                            uploadingAvatarFor.firstName,
                            uploadingAvatarFor.lastName
                          ).text,
                        }
                      : undefined
                  }
                >
                  {uploadingAvatarFor &&
                    getInitials(
                      uploadingAvatarFor.firstName,
                      uploadingAvatarFor.lastName
                    )}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* File Input */}
            <div className="space-y-2">
              <Label htmlFor="avatar">Select Image</Label>
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
              />
              <p className="text-xs text-muted-foreground">
                Supported formats: JPEG, PNG, GIF, WebP. Max size: 5MB
              </p>
            </div>

            {/* Preview Info */}
            {selectedFile && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Selected:</strong> {selectedFile.name} (
                  {(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUploadingAvatarFor(null)
                setSelectedFile(null)
                setPreviewUrl(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadAvatar}
              disabled={!selectedFile || uploadAvatarMutation.isPending}
              className="gap-2"
            >
              {uploadAvatarMutation.isPending ? (
                'Uploading...'
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
    </div>
  )
}
