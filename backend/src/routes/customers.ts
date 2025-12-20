import { Router } from 'express'
import { db, customers } from '../db/index.js'
import { customerSchema } from '../utils/validation.js'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.js'
import { eq } from 'drizzle-orm'

const router = Router()

// Get all customers
router.get('/', authenticate, async (req, res) => {
  try {
    const allCustomers = await db.query.customers.findMany({
      orderBy: (customers, { asc }) => [asc(customers.name)],
    })
    res.json(allCustomers)
  } catch (error) {
    console.error('Get customers error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get customer by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const customerId = parseInt(req.params.id)
    const customer = await db.query.customers.findFirst({
      where: (customers, { eq }) => eq(customers.id, customerId),
    })

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' })
    }

    res.json(customer)
  } catch (error) {
    console.error('Get customer error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

// Create customer (admin only)
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const data = customerSchema.parse(req.body)
    const [customer] = await db.insert(customers).values(data).returning()
    res.status(201).json(customer)
  } catch (error) {
    console.error('Create customer error:', error)
    res.status(400).json({ error: 'Invalid request' })
  }
})

// Update customer (admin only)
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const customerId = parseInt(req.params.id)
    const data = customerSchema.parse(req.body)

    const [updated] = await db
      .update(customers)
      .set(data)
      .where(eq(customers.id, customerId))
      .returning()

    if (!updated) {
      return res.status(404).json({ error: 'Customer not found' })
    }

    res.json(updated)
  } catch (error) {
    console.error('Update customer error:', error)
    res.status(400).json({ error: 'Invalid request' })
  }
})

// Delete customer (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const customerId = parseInt(req.params.id)
    await db.delete(customers).where(eq(customers.id, customerId))
    res.status(204).send()
  } catch (error) {
    console.error('Delete customer error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
