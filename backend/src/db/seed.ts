import { db, users } from './index.js'
import bcrypt from 'bcryptjs'

async function main() {
  console.log('Seeding database...')

  // Check if admin already exists
  const existingAdmin = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, 'af@ovos.at'),
  })

  if (existingAdmin) {
    console.log('Admin user already exists!')
    return
  }

  // Generate a secure password
  const password = generateSecurePassword()
  const passwordHash = await bcrypt.hash(password, 10)

  // Create admin user
  await db.insert(users).values({
    email: 'af@ovos.at',
    passwordHash,
    role: 'admin',
  })

  console.log('✅ Admin user created successfully!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📧 Email: af@ovos.at')
  console.log(`🔑 Password: ${password}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('⚠️  Please save this password securely!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

function generateSecurePassword(): string {
  const length = 16
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  const randomValues = new Uint32Array(length)
  crypto.getRandomValues(randomValues)

  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length]
  }

  return password
}

main()
  .then(() => {
    console.log('Seeding completed!')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Seeding failed!')
    console.error(err)
    process.exit(1)
  })
