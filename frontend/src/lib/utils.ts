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

// Color palette from https://coolors.co/757780-a4a291-d2cca1-85a291-387780-8aa6aa-dbd4d3-e28392-e83151
const AVATAR_COLORS = [
  { bg: '#757780', text: '#FFFFFF' }, // gray
  { bg: '#A4A291', text: '#000000' }, // beige-gray
  { bg: '#D2CCA1', text: '#000000' }, // light beige
  { bg: '#85A291', text: '#FFFFFF' }, // sage green
  { bg: '#387780', text: '#FFFFFF' }, // teal
  { bg: '#8AA6AA', text: '#FFFFFF' }, // light blue-gray
  { bg: '#DBD4D3', text: '#000000' }, // light gray
  { bg: '#E28392', text: '#FFFFFF' }, // pink
  { bg: '#E83151', text: '#FFFFFF' }, // red-pink
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
