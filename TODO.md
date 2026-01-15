# OVOS Sprint - Feature Roadmap

## High Priority

(No high priority items at this time)

## Medium Priority

### Component Refactoring

- [ ] Break down large components into smaller, focused units
  - Timeline.tsx (76KB) - extract sub-components
  - DashboardPage.tsx (21KB) - extract sections
- [ ] Create feature-based component directories with index.ts exports
- [ ] Move shared types to feature-specific types.ts files

### Testing Infrastructure

- [ ] Set up Vitest testing framework
- [ ] Install @testing-library/react and @testing-library/jest-dom
- [ ] Configure vitest.config.ts for frontend
- [ ] Create example tests for core components (Timeline, DashboardPage)
- [ ] Add test scripts to package.json (frontend and backend)
- [ ] Test user flows (navigation, state updates) using @testing-library/react
- [ ] Add backend API endpoint tests

**Location**: `src/**/tests/*.test.tsx` (as per original plan)
**Commands**: `npm test` (frontend/backend)

### PW Reset form for users

- [ ] users must be able to rest their pw if they are logged out of the platform

## Low Priority

### Disclaimer on login page

- [ ] Add a small disclaimer on the login page "Made with 💚 by ovos and Claude"

### Email Spam Filter Investigation

- [ ] Investigate why invitation emails land in spam folder despite 10/10 score on mailtester.com
- [ ] Review email content and headers to improve deliverability
- [ ] Consider adding DMARC policy to DNS records

**Note**: Emails are being sent successfully via SparkPost, but may be filtered as spam by some providers.

### Internationalization (i18n)

- [ ] Install and configure intlayer packages (`intlayer`, `react-intlayer`)
- [ ] Create `.content.ts` files for all pages and components
- [ ] Support German (de) and English (en) locales
- [ ] Replace hardcoded UI text with intlayer hooks
- [ ] Update date formatting in `lib/utils.ts` to use dynamic locale
- [ ] Configure intlayer build process
- [ ] Add language switcher component

**Current State**: Application uses German locale (`de-AT`) for date formatting but all UI text is in English.

## Completed Features

- [x] shadcn/ui component library integration (19 components)
- [x] Dark mode support with theme provider
- [x] Tailwind CSS configuration with custom colors
- [x] TypeScript setup and type definitions
- [x] State management (Zustand + React Query)
- [x] Real-time WebSocket synchronization
- [x] JWT authentication with role-based access control
- [x] Docker Compose development environment
- [x] Email service with React Email templates
- [x] SparkPost SMTP integration for production emails
- [x] Git branching strategy (main/next workflow)
- [x] Non-working day warning for timeline assignments
