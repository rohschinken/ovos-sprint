import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/client'
import { Customer } from '@/types'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { useViewMode } from '@/hooks/use-view-mode'
import { ViewModeToggle } from '@/components/ViewModeToggle'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { AlertDialog } from '@/components/ui/alert-dialog'

interface CascadeInfo {
  projects: number
  assignments: number
  dayAssignments: number
  milestones: number
}

export default function CustomersPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialog, setDeleteDialog] = useState<{
    customerId: number
    customerName: string
    cascadeInfo: CascadeInfo | null
  } | null>(null)

  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { viewMode, setViewMode } = useViewMode('customers')

  const isAdmin = user?.role === 'admin'
  const isProjectManager = user?.role === 'project_manager'

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customers')
      return response.data as Customer[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; icon?: string | null }) => {
      const response = await api.post('/customers', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setIsCreateOpen(false)
      resetForm()
      toast({ title: 'Customer created successfully' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, icon }: { id: number; name: string; icon?: string | null }) => {
      const response = await api.put(`/customers/${id}`, { name, icon })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setEditingCustomer(null)
      resetForm()
      toast({ title: 'Customer updated successfully' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/customers/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast({ title: 'Customer deleted successfully' })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, name, icon: icon || null })
    } else {
      createMutation.mutate({ name, icon: icon || null })
    }
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setName(customer.name)
    setIcon(customer.icon || '')
  }

  const handleDelete = async (customer: Customer) => {
    try {
      const response = await api.get(`/customers/${customer.id}/cascade-info`)
      setDeleteDialog({
        customerId: customer.id,
        customerName: customer.name,
        cascadeInfo: response.data,
      })
    } catch (error) {
      toast({
        title: 'Failed to load customer info',
        description: 'Proceeding without cascade information',
        variant: 'destructive',
      })
      setDeleteDialog({
        customerId: customer.id,
        customerName: customer.name,
        cascadeInfo: null,
      })
    }
  }

  const resetForm = () => {
    setName('')
    setIcon('')
  }

  const handleDialogClose = () => {
    setIsCreateOpen(false)
    setEditingCustomer(null)
    resetForm()
  }

  const filteredCustomers = customers.filter((customer) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return customer.name.toLowerCase().includes(query)
  })

  // Split customers for project managers
  const myCustomers = filteredCustomers.filter((c) => c.managerId === user?.id)
  const otherCustomers = filteredCustomers.filter((c) => c.managerId !== user?.id)

  const CustomerCard = ({
    customer,
    index,
    canEdit,
    onEdit,
    onDelete,
  }: {
    customer: Customer
    index: number
    canEdit: boolean
    onEdit: () => void
    onDelete: () => void
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className={cn('hover:shadow-md transition-shadow', !canEdit && 'opacity-75')}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {customer.icon && <div className="text-4xl">{customer.icon}</div>}
              <div>
                <CardTitle>{customer.name}</CardTitle>
                <CardDescription>
                  Created {new Date(customer.createdAt).toLocaleDateString()}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        {canEdit ? (
          <CardContent>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onEdit} className="flex-1">
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="flex-1 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            </div>
          </CardContent>
        ) : (
          <CardContent>
            <p className="text-xs text-muted-foreground">View only</p>
          </CardContent>
        )}
      </Card>
    </motion.div>
  )

  const CustomerTable = ({
    customers,
    canEdit,
    onEdit,
    onDelete,
  }: {
    customers: Customer[]
    canEdit: (customer: Customer) => boolean
    onEdit: (customer: Customer) => void
    onDelete: (customer: Customer) => void
  }) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Icon</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Manager</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer.id} className={cn(!canEdit(customer) && 'opacity-75')}>
              <TableCell className="text-2xl">{customer.icon || '-'}</TableCell>
              <TableCell className="font-medium">{customer.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {customer.manager?.email || '-'}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(customer.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                {canEdit(customer) ? (
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(customer)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(customer)}
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
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage your customers and clients</p>
        </div>
        {(isAdmin || isProjectManager) && (
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </motion.div>
        )}
      </motion.div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search customers by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {/* Project Manager: Show "My Customers" and "Other Customers" sections */}
      {isProjectManager ? (
        <>
          {/* My Customers Section */}
          {myCustomers.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">My Customers</h2>
              {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myCustomers.map((customer, index) => (
                    <CustomerCard
                      key={customer.id}
                      customer={customer}
                      index={index}
                      canEdit={true}
                      onEdit={() => handleEdit(customer)}
                      onDelete={() => handleDelete(customer)}
                    />
                  ))}
                </div>
              ) : (
                <CustomerTable
                  customers={myCustomers}
                  canEdit={() => true}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              )}
            </div>
          )}

          {/* Other Customers Section */}
          {otherCustomers.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-muted-foreground">Other Customers</h2>
              {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {otherCustomers.map((customer, index) => (
                    <CustomerCard
                      key={customer.id}
                      customer={customer}
                      index={index}
                      canEdit={false}
                      onEdit={() => {}}
                      onDelete={() => {}}
                    />
                  ))}
                </div>
              ) : (
                <CustomerTable
                  customers={otherCustomers}
                  canEdit={() => false}
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              )}
            </div>
          )}

          {myCustomers.length === 0 && otherCustomers.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No customers found. Create your first customer!
            </p>
          )}
        </>
      ) : (
        /* Admin: Show all customers together */
        <>
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.map((customer, index) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  index={index}
                  canEdit={true}
                  onEdit={() => handleEdit(customer)}
                  onDelete={() => handleDelete(customer)}
                />
              ))}
            </div>
          ) : (
            <CustomerTable
              customers={filteredCustomers}
              canEdit={() => true}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}

          {filteredCustomers.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              {customers.length > 0 ? `No customers found matching "${searchQuery}".` : 'No customers yet. Click "Add Customer" to create one.'}
            </p>
          )}
        </>
      )}

      <Dialog open={isCreateOpen || !!editingCustomer} onOpenChange={handleDialogClose}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
              <DialogDescription>
                {editingCustomer
                  ? 'Update the customer information below.'
                  : 'Create a new customer.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Customer name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon">Icon (Emoji)</Label>
                <Input
                  id="icon"
                  placeholder="🏢 Enter emoji (optional)"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground">
                  Optional emoji to represent this customer
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleDialogClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? (editingCustomer ? 'Saving...' : 'Creating...')
                  : (editingCustomer ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Customer Confirmation Dialog */}
      <AlertDialog
        open={!!deleteDialog}
        onOpenChange={() => setDeleteDialog(null)}
        title="Delete Customer"
        description="This will permanently delete the customer and all associated data. This action cannot be undone."
        entityName={deleteDialog?.customerName}
        cascadeWarning={deleteDialog?.cascadeInfo ? {
          items: [
            { type: 'projects', count: deleteDialog.cascadeInfo.projects },
            { type: 'project assignments', count: deleteDialog.cascadeInfo.assignments },
            { type: 'day assignments', count: deleteDialog.cascadeInfo.dayAssignments },
            { type: 'milestones', count: deleteDialog.cascadeInfo.milestones },
          ].filter(item => item.count > 0)
        } : undefined}
        confirmLabel="Delete Customer"
        onConfirm={() => {
          if (deleteDialog) {
            deleteMutation.mutate(deleteDialog.customerId)
            setDeleteDialog(null)
          }
        }}
        isLoading={deleteMutation.isPending}
      />
    </motion.div>
    </div>
  )
}
