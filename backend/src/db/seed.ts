import { db, users } from './index.js'
import bcrypt from 'bcryptjs'
import * as readline from 'readline'

async function promptForEmail(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question('Enter admin email address: ', (email) => {
      rl.close()
      resolve(email.trim())
    })
  })
}

async function main() {
  console.log('Seeding database...')

  // Check if any admin user already exists
  const existingAdmins = await db.query.users.findMany({
    where: (users, { eq }) => eq(users.role, 'admin'),
  })

  if (existingAdmins.length > 0) {
    console.log('Admin user(s) already exist!')
    return
  }

  // Prompt for admin email
  const adminEmail = await promptForEmail()

  if (!adminEmail || !adminEmail.includes('@')) {
    console.error('❌ Invalid email address!')
    process.exit(1)
  }

  // Generate a secure password
  const password = generateSecurePassword()
  const passwordHash = await bcrypt.hash(password, 10)

  // Create admin user
  await db.insert(users).values({
    email: adminEmail,
    passwordHash,
    role: 'admin',
  })

  console.log('✅ Admin user created successfully!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📧 Email: ${adminEmail}`)
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
