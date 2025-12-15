import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  token: z.string(),
})

export const inviteSchema = z.object({
  email: z.string().email(),
})

export const teamSchema = z.object({
  name: z.string().min(1),
})

export const teamMemberSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  avatarUrl: z.string().url().optional().nullable(),
})

export const projectSchema = z.object({
  customer: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(['confirmed', 'tentative']),
})

export const projectAssignmentSchema = z.object({
  projectId: z.number().int().positive(),
  teamMemberId: z.number().int().positive(),
})

export const dayAssignmentSchema = z.object({
  projectAssignmentId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  comment: z.string().optional().nullable(),
})

export const settingsSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
})
