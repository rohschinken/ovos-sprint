import { db, teamMembers } from '../db/index.js'
import { eq } from 'drizzle-orm'

// Muted, professional avatar color palette (same as frontend)
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

function getAvatarColor(firstName: string, lastName: string): { bg: string; text: string } {
  const fullName = `${firstName} ${lastName}`.toLowerCase()
  const hash = hashString(fullName)
  const index = hash % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

function generateAvatarUrl(firstName: string, lastName: string): string {
  const colors = getAvatarColor(firstName, lastName)
  // Remove # from hex colors for URL
  const bgColor = colors.bg.substring(1)
  const textColor = colors.text.substring(1)

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    `${firstName}+${lastName}`
  )}&background=${bgColor}&color=${textColor}&size=128&bold=true&rounded=true`
}

/**
 * Migration: Fix avatar color consistency
 *
 * Updates generated avatar URLs (ui-avatars.com) to use consistent color palette
 * instead of random colors. Leaves custom uploaded avatars unchanged.
 */
export async function fixAvatarColors() {
  console.log('Starting avatar color consistency migration...')

  // Get all members
  const allMembers = await db.query.teamMembers.findMany()

  let updatedCount = 0
  let skippedCount = 0

  for (const member of allMembers) {
    // Only update if avatarUrl is a generated one (ui-avatars.com)
    if (member.avatarUrl && member.avatarUrl.includes('ui-avatars.com')) {
      // Check if it has background=random or a specific color that's not in our palette
      if (member.avatarUrl.includes('background=random') ||
          member.avatarUrl.includes('background=') && !member.avatarUrl.includes('background=random')) {

        // Regenerate URL with consistent colors
        const newAvatarUrl = generateAvatarUrl(member.firstName, member.lastName)

        await db
          .update(teamMembers)
          .set({ avatarUrl: newAvatarUrl })
          .where(eq(teamMembers.id, member.id))

        console.log(`Updated avatar for: ${member.firstName} ${member.lastName}`)
        updatedCount++
      } else {
        console.log(`Skipped (already correct): ${member.firstName} ${member.lastName}`)
        skippedCount++
      }
    } else {
      console.log(`Skipped (custom avatar): ${member.firstName} ${member.lastName}`)
      skippedCount++
    }
  }

  console.log(`\nMigration complete:`)
  console.log(`- Updated: ${updatedCount} members`)
  console.log(`- Skipped: ${skippedCount} members`)
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixAvatarColors()
    .then(() => {
      console.log('Migration completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Migration failed:', error)
      process.exit(1)
    })
}
