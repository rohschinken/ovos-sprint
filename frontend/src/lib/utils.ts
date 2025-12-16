import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('de-AT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('de-AT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Modern, professional avatar color palette with excellent contrast
const AVATAR_COLORS = [
  { bg: '#6366F1', text: '#FFFFFF' }, // indigo
  { bg: '#8B5CF6', text: '#FFFFFF' }, // violet
  { bg: '#EC4899', text: '#FFFFFF' }, // pink
  { bg: '#F43F5E', text: '#FFFFFF' }, // rose
  { bg: '#F97316', text: '#FFFFFF' }, // orange
  { bg: '#EAB308', text: '#000000' }, // yellow
  { bg: '#10B981', text: '#FFFFFF' }, // emerald
  { bg: '#14B8A6', text: '#FFFFFF' }, // teal
  { bg: '#0EA5E9', text: '#FFFFFF' }, // sky
  { bg: '#3B82F6', text: '#FFFFFF' }, // blue
  { bg: '#6D28D9', text: '#FFFFFF' }, // purple
  { bg: '#DB2777', text: '#FFFFFF' }, // fuchsia
]

// Hash function to consistently select a color based on a string
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

export function getAvatarColor(firstName: string, lastName: string): { bg: string; text: string } {
  const fullName = `${firstName} ${lastName}`.toLowerCase()
  const hash = hashString(fullName)
  const index = hash % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

export function generateAvatarUrl(firstName: string, lastName: string): string {
  const initials = getInitials(firstName, lastName)
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    `${firstName}+${lastName}`
  )}&background=random&color=fff&size=128&bold=true&rounded=true`
}
