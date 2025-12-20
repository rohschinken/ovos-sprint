export interface EmailConfig {
  host: string
  port: number
  secure: boolean
  from: {
    email: string
    name: string
  }
}

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export interface TeamInviteData {
  teamMemberName: string
  inviterName: string
  inviteLink: string
  expiresInDays: number
}

export interface UserInviteData {
  inviterName: string
  inviteLink: string
  expiresInDays: number
  role: 'admin' | 'user'
}

export interface PasswordResetData {
  userName: string
  resetLink: string
  expiresInHours: number
}
