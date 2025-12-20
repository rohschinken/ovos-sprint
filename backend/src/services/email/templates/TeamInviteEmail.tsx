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
import type { TeamInviteData } from '../types.js'

export default function TeamInviteEmail({
  teamMemberName,
  inviterName,
  inviteLink,
  expiresInDays,
}: TeamInviteData) {
  return (
    <Html>
      <Head />
      <Preview>You've been invited to join OVOS Sprint</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={title}>OVOS Sprint</Text>
          </Section>

          <Section style={content}>
            <Text style={greeting}>Hi {teamMemberName},</Text>

            <Text style={paragraph}>
              {inviterName} has invited you to join <strong>OVOS Sprint</strong> as a team member.
            </Text>

            <Text style={paragraph}>
              Click the button below to accept the invitation and create your account:
            </Text>

            <Button href={inviteLink} style={button}>
              Accept Invitation
            </Button>

            <Text style={note}>
              This invitation will expire in {expiresInDays} days.
            </Text>

            <Hr style={hr} />

            <Text style={footer}>
              If you didn't expect this invitation, you can safely ignore this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Inline styles for email compatibility
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
  backgroundColor: '#2563eb',
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
