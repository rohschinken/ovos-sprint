import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/client'
import { Project, ProjectStatus, Customer } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import AssignMemberDialog from '@/components/AssignMemberDialog'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/auth'
import { useViewMode } from '@/hooks/use-view-mode'
import { ViewModeToggle } from '@/components/ViewModeToggle'
import { Plus, Pencil, Trash2, CheckCircle2, Clock, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { AlertDialog } from '@/components/ui/alert-dialog'

interface CascadeInfo {
  assignments: number
  dayAssignments: number
  milestones: number
}

export default function ProjectsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [assigningProject, setAssigningProject] = useState<Project | null>(null)
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<ProjectStatus>('confirmed')
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialog, setDeleteDialog] = useState<{
    projectId: number
    projectName: string
    cascadeInfo: CascadeInfo | null
  } | null>(null)

  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { viewMode, setViewMode } = useViewMode('projects')

  const isAdmin = user?.role === 'admin'
  const isProjectManager = user?.role === 'project_manager'

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await api.get('/projects')
      return response.data as Project[]
    },
  })

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customers')
      return response.data as Customer[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: {
      customerId: number
      name: string
      status: ProjectStatus
    }) => {
      const response = await api.post('/projects', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setIsCreateOpen(false)
      resetForm()
      toast({ title: 'Project created successfully' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: number
      customerId: number
      name: string
      status: ProjectStatus
    }) => {
      const response = await api.put(`/projects/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setEditingProject(null)
      resetForm()
      toast({ title: 'Project updated successfully' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/projects/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast({ title: 'Project deleted successfully' })
    },
  })

  const resetForm = () => {
    setCustomerId('')
    setName('')
    setStatus('confirmed')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (customerId === '') {
      toast({ title: 'Please select a customer', variant: 'destructive' })
      return
    }
    if (editingProject) {
      updateMutation.mutate({
        id: editingProject.id,
        customerId: Number(customerId),
        name,
        status,
      })
    } else {
      createMutation.mutate({ customerId: Number(customerId), name, status })
    }
  }

  const filteredProjects = projects.filter((project) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const customerName = project.customer?.name?.toLowerCase() || ''
    const projectName = project.name.toLowerCase()
    return customerName.includes(query) || projectName.includes(query)
  })

  // Split projects for project managers
  const myProjects = filteredProjects.filter((p) => p.managerId === user?.id)
  const otherProjects = filteredProjects.filter((p) => p.managerId !== user?.id)

  const handleDeleteClick = async (project: Project) => {
    try {
      const response = await api.get(`/projects/${project.id}/cascade-info`)
      setDeleteDialog({
        projectId: project.id,
        projectName: project.name,
        cascadeInfo: response.data,
      })
    } catch (error) {
      toast({
        title: 'Failed to load project info',
        description: 'Proceeding without cascade information',
        variant: 'destructive',
      })
      setDeleteDialog({
        projectId: project.id,
        projectName: project.name,
        cascadeInfo: null,
      })
    }
  }

  const ProjectCard = ({
    project,
    index,
    canEdit,
    onEdit,
    onDelete,
    onAssign,
  }: {
    project: Project
    index: number
    canEdit: boolean
    onEdit: () => void
    onDelete: () => void
    onAssign: () => void
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className={cn(!canEdit && 'opacity-75')}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle>{project.name}</CardTitle>
              <CardDescription>
                {project.customer?.icon && `${project.customer.icon} `}
                {project.customer?.name || 'Unknown Customer'}
              </CardDescription>
            </div>
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                project.status === 'confirmed'
                  ? 'bg-confirmed text-green-700 dark:bg-confirmed/40 dark:text-green-400'
                  : 'bg-tentative text-slate-700 dark:bg-tentative/20 dark:text-slate-300'
              )}
            >
              {project.status === 'confirmed' ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
              {project.status}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={onAssign} className="gap-2">
                <Users className="h-3 w-3" />
                Assign
              </Button>
              <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
                <Pencil className="h-3 w-3" />
                Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={onDelete} className="gap-2">
                <Trash2 className="h-3 w-3" />
                Delete
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">View only</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )

  const ProjectTable = ({
    projects,
    canEdit,
    onEdit,
    onDelete,
    onAssign,
  }: {
    projects: Project[]
    canEdit: (project: Project) => boolean
    onEdit: (project: Project) => void
    onDelete: (project: Project) => void
    onAssign: (project: Project) => void
  }) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Manager</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id} className={cn(!canEdit(project) && 'opacity-75')}>
              <TableCell className="font-medium">{project.name}</TableCell>
              <TableCell>
                {project.customer?.icon && `${project.customer.icon} `}
                {project.customer?.name || 'Unknown'}
              </TableCell>
              <TableCell>
                <div
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                    project.status === 'confirmed'
                      ? 'bg-confirmed text-green-700 dark:bg-confirmed/40 dark:text-green-400'
                      : 'bg-tentative text-slate-700 dark:bg-tentative/20 dark:text-slate-300'
                  )}
                >
                  {project.status === 'confirmed' ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  {project.status}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {project.manager?.email || '-'}
              </TableCell>
              <TableCell className="text-right">
                {canEdit(project) ? (
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onAssign(project)}>
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(project)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(project)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">View only</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

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
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Manage your projects</p>
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Project
          </Button>
        </motion.div>
      </motion.div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search projects by name or customer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {/* Project Manager: Show "My Projects" and "Other Projects" sections */}
      {isProjectManager ? (
        <>
          {/* My Projects Section */}
          {myProjects.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">My Projects</h2>
              {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myProjects.map((project, index) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      index={index}
                      canEdit={isAdmin}
                      onEdit={() => {
                        setEditingProject(project)
                        setCustomerId(project.customerId)
                        setName(project.name)
                        setStatus(project.status)
                      }}
                      onDelete={() => handleDeleteClick(project)}
                      onAssign={() => setAssigningProject(project)}
                    />
                  ))}
                </div>
              ) : (
                <ProjectTable
                  projects={myProjects}
                  canEdit={() => isAdmin}
                  onEdit={(project) => {
                    setEditingProject(project)
                    setCustomerId(project.customerId)
                    setName(project.name)
                    setStatus(project.status)
                  }}
                  onDelete={handleDeleteClick}
                  onAssign={(project) => setAssigningProject(project)}
                />
              )}
            </div>
          )}

          {/* Other Projects Section */}
          {otherProjects.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-muted-foreground">Other Projects</h2>
              {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {otherProjects.map((project, index) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      index={index}
                      canEdit={false}
                      onEdit={() => {}}
                      onDelete={() => {}}
                      onAssign={() => {}}
                    />
                  ))}
                </div>
              ) : (
                <ProjectTable
                  projects={otherProjects}
                  canEdit={() => false}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onAssign={() => {}}
                />
              )}
            </div>
          )}

          {myProjects.length === 0 && otherProjects.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No projects found. Create your first project!
            </p>
          )}
        </>
      ) : (
        /* Admin: Show all projects together */
        <>
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project, index) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={index}
                  canEdit={true}
                  onEdit={() => {
                    setEditingProject(project)
                    setCustomerId(project.customerId)
                    setName(project.name)
                    setStatus(project.status)
                  }}
                  onDelete={() => handleDeleteClick(project)}
                  onAssign={() => setAssigningProject(project)}
                />
              ))}
            </div>
          ) : (
            <ProjectTable
              projects={filteredProjects}
              canEdit={() => true}
              onEdit={(project) => {
                setEditingProject(project)
                setCustomerId(project.customerId)
                setName(project.name)
                setStatus(project.status)
              }}
              onDelete={handleDeleteClick}
              onAssign={(project) => setAssigningProject(project)}
            />
          )}

          {filteredProjects.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No projects found. Create your first project!
            </p>
          )}
        </>
      )}

      <Dialog
        open={isCreateOpen || !!editingProject}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false)
            setEditingProject(null)
            resetForm()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProject ? 'Edit Project' : 'Create Project'}
            </DialogTitle>
            <DialogDescription>
              {editingProject
                ? 'Update the project details'
                : 'Create a new project'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="customerId">Customer</Label>
                <Select
                  value={customerId === '' ? undefined : String(customerId)}
                  onValueChange={(value) => setCustomerId(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={String(customer.id)}>
                        {customer.icon ? `${customer.icon} ` : ''}{customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {customers.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No customers available. Create one first in the Customers page.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as ProjectStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="tentative">Tentative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? (editingProject ? 'Saving...' : 'Creating...')
                  : (editingProject ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {assigningProject && (
        <AssignMemberDialog
          project={assigningProject}
          open={!!assigningProject}
          onOpenChange={(open) => !open && setAssigningProject(null)}
        />
      )}

      {/* Delete Project Confirmation Dialog */}
      <AlertDialog
        open={!!deleteDialog}
        onOpenChange={() => setDeleteDialog(null)}
        title="Delete Project"
        description="This will permanently delete the project and all associated data. This action cannot be undone."
        entityName={deleteDialog?.projectName}
        cascadeWarning={deleteDialog?.cascadeInfo ? {
          items: [
            { type: 'project assignments', count: deleteDialog.cascadeInfo.assignments },
            { type: 'day assignments', count: deleteDialog.cascadeInfo.dayAssignments },
            { type: 'milestones', count: deleteDialog.cascadeInfo.milestones },
          ].filter(item => item.count > 0)
        } : undefined}
        confirmLabel="Delete Project"
        onConfirm={() => {
          if (deleteDialog) {
            deleteMutation.mutate(deleteDialog.projectId)
            setDeleteDialog(null)
          }
        }}
        isLoading={deleteMutation.isPending}
      />
    </motion.div>
    </div>
  )
}
