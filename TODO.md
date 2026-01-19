# OVOS Sprint - Feature Roadmap

## High Priority

- [ ] bug: Vertical Scrolling on all pages (Customers, Projects, Members, Settings. etc.) is broken

## Medium Priority

### Component Refactoring

- [ ] Move shared types to feature-specific types.ts files

### missing tooltips in header rows in Timeline

- [ ] we used to have Tooltips when hovering above the header rows for adding/removing Milestones and Days-Off. Those tooltips seem to have vanished when the Timeline was refactored. Bring them back!

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


### Google Authentication

- [ ] Google Authentication (Google Workspace Domain/Key must be configurable)

### Archived Projects

- [ ] New Status for Projects: "Archived" - Projects with this status should never appear in the Timeline View. Use a fitting icon and color code for this status. Total project statuses: Confirmed, Tentative, Archived
- [ ] Allow changing the project status in /projects View from both the card view and list view modes by directly clicking on the status label. A select field should appear when clicking on the status label.

## Low Priority

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
- [ ] Use Tolgee for interactive localization

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
- [x] Password reset functionality with secure token-based flow
- [x] Login page disclaimer footer
- [x] Interactive onboarding slideshow with help button
- [x] Component refactoring (Timeline and Dashboard split into focused modules)
- [x] Fixed sticky first column in Timeline view
- [x] "Hide empty rows" option in Timeline Display Settings
