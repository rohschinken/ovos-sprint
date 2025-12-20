import nodemailer, { Transporter } from 'nodemailer'
import { render } from '@react-email/render'
import type { EmailConfig, EmailOptions, TeamInviteData, UserInviteData, PasswordResetData } from './types.js'
import TeamInviteEmail from './templates/TeamInviteEmail.js'
import UserInviteEmail from './templates/UserInviteEmail.js'
import PasswordResetEmail from './templates/PasswordResetEmail.js'

class EmailService {
  private transporter: Transporter | null = null
  private config: EmailConfig

  constructor() {
    this.config = {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025'),
      secure: process.env.SMTP_SECURE === 'true',
      from: {
        email: process.env.SMTP_FROM_EMAIL || 'noreply@ovos-sprint.local',
        name: process.env.SMTP_FROM_NAME || 'ovos Sprint 🏃‍♂️‍➡️',
      },
    }

    this.initialize()
  }

  private initialize() {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        // For Mailpit, we don't need auth in development
        // In production, you'd add auth here
      })

      console.log(`📧 Email service initialized (${this.config.host}:${this.config.port})`)
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error)
    }
  }

  private async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email transporter not initialized')
      return false
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"${this.config.from.name}" <${this.config.from.email}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      })

      console.log(`✅ Email sent to ${options.to}: ${info.messageId}`)
      return true
    } catch (error) {
      console.error(`❌ Failed to send email to ${options.to}:`, error)
      return false
    }
  }

  async sendTeamInvite(to: string, data: TeamInviteData): Promise<boolean> {
    const html = render(TeamInviteEmail(data))

    return this.sendEmail({
      to,
      subject: `You've been invited to join ovos Sprint 🏃‍♂️‍➡️`,
      html,
    })
  }

  async sendUserInvite(to: string, data: UserInviteData): Promise<boolean> {
    const html = render(UserInviteEmail(data))

    return this.sendEmail({
      to,
      subject: `Invitation to ovos Sprint 🏃‍♂️‍➡️`,
      html,
    })
  }

  async sendPasswordReset(to: string, data: PasswordResetData): Promise<boolean> {
    const html = render(PasswordResetEmail(data))

    return this.sendEmail({
      to,
      subject: `Reset your ovos Sprint 🏃‍♂️‍➡️ password`,
      html,
    })
  }

  // Test method for verification
  async sendTestEmail(to: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: 'Test Email from ovos Sprint 🏃‍♂️‍➡️',
      html: '<h1>Test Email</h1><p>Email service is working correctly!</p>',
    })
  }
}

// Export singleton instance
export const emailService = new EmailService()
