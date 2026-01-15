import crypto from 'crypto'
import bcrypt from 'bcryptjs'

/**
 * Generates a cryptographically secure password reset token
 * Returns both the plain token (to send via email) and hashed version (to store in DB)
 */
export function generatePasswordResetToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString('hex') // 64 char hex = 256 bits entropy
  const tokenHash = bcrypt.hashSync(token, 10)
  return { token, tokenHash }
}

/**
 * Verifies a plain token against a hashed token
 */
export function verifyPasswordResetToken(token: string, tokenHash: string): boolean {
  return bcrypt.compareSync(token, tokenHash)
}

/**
 * Calculate expiry time (1 hour from now)
 */
export function getPasswordResetExpiry(): string {
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 1)
  return expiresAt.toISOString()
}
