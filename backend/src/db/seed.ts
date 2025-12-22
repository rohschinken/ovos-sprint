import { db, users } from './index.js'
import bcrypt from 'bcryptjs'
import * as readline from 'readline'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

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

async function promptForPassword(): Promise<string | null> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question('Enter admin password (leave empty to auto-generate): ', (password) => {
      rl.close()
      resolve(password.trim() || null)
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

  // Check for non-interactive mode via environment variables
  const envEmail = process.env.ADMIN_EMAIL
  const envPassword = process.env.ADMIN_PASSWORD
  const isNonInteractive = envEmail !== undefined

  let adminEmail: string
  let password: string
  let passwordWasProvided = false

  if (isNonInteractive) {
    // Non-interactive mode: use environment variables
    console.log('Running in non-interactive mode (using environment variables)')

    if (!envEmail || !envEmail.includes('@')) {
      console.error('❌ Invalid ADMIN_EMAIL environment variable!')
      process.exit(1)
    }

    adminEmail = envEmail

    if (envPassword && envPassword.length >= 8) {
      password = envPassword
      passwordWasProvided = true
    } else if (envPassword) {
      console.error('❌ ADMIN_PASSWORD must be at least 8 characters!')
      process.exit(1)
    } else {
      password = generateSecurePassword()
    }
  } else {
    // Interactive mode: prompt for input
    adminEmail = await promptForEmail()

    if (!adminEmail || !adminEmail.includes('@')) {
      console.error('❌ Invalid email address!')
      process.exit(1)
    }

    const inputPassword = await promptForPassword()
    if (inputPassword) {
      if (inputPassword.length < 8) {
        console.error('❌ Password must be at least 8 characters!')
        process.exit(1)
      }
      password = inputPassword
      passwordWasProvided = true
    } else {
      password = generateSecurePassword()
    }
  }

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
  if (passwordWasProvided) {
    console.log('🔑 Password: (as provided)')
  } else {
    console.log(`🔑 Password: ${password}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('⚠️  Please save this password securely!')
  }
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
