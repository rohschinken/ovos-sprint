import React from 'react'
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
} from '@react-email/components'
import type { PasswordResetData } from '../types.js'

export default function PasswordResetEmail({
  userName,
  resetLink,
  expiresInHours,
}: PasswordResetData) {
  return (
    <Html>
      <Head />
      <Preview>Reset your ovos Sprint 🏃‍♂️‍➡️ password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={title}>ovos Sprint 🏃‍♂️‍➡️</Text>
          </Section>

          <Section style={content}>
            <Text style={greeting}>Hi {userName},</Text>

            <Text style={paragraph}>
              We received a request to reset your password for your ovos Sprint 🏃‍♂️‍➡️ account.
            </Text>

            <Text style={paragraph}>
              Click the button below to reset your password:
            </Text>

            <Button href={resetLink} style={button}>
              Reset Password
            </Button>

            <Text style={note}>
              This link will expire in {expiresInHours} hours.
            </Text>

            <Hr style={hr} />

            <Text style={footer}>
              If you didn't request a password reset, you can safely ignore this email.
              Your password will not be changed.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles (consistent with other templates)
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const header = {
  padding: '32px 48px',
  textAlign: 'center' as const,
}

const title = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1f2937',
  margin: '0',
}

const content = {
  padding: '0 48px',
}

const greeting = {
  fontSize: '16px',
  color: '#1f2937',
  marginBottom: '24px',
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#374151',
  marginBottom: '16px',
}

const button = {
  backgroundColor: '#dc2626',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
  margin: '24px 0',
}

const note = {
  fontSize: '14px',
  color: '#6b7280',
  marginTop: '24px',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
}

const footer = {
  fontSize: '14px',
  color: '#9ca3af',
  lineHeight: '20px',
}
