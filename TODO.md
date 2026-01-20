# OVOS Sprint - Feature Roadmap

## High Priority

## Medium Priority

### Remove Card View in Teams, Members, Customers and Projects

- [x] The card view in Teams, Members, Customers and Projects should be remove entirely in favor of the list view

### Sorting in Teams, Members, Customers and Projects pages

- [ ] Add sorting to list view in Teams, Members, Customers and Projects for columns where ASC and DESC sorting makes sense

### Archived Projects

- [ ] New Status for Projects: "Archived" - Projects with this status should never appear in the Timeline View. Use a fitting icon and color code for this status. Total project statuses: Confirmed, Tentative, Archived
- [ ] Allow changing the project status in /projects View from list view modes by directly clicking on the status label. A select field should appear when clicking on the status label.
- [ ] Add a toggle "show archived projects" to Projects page. By default this toggle should be disabled. This means by default archived projects must be filtered from the list view in Projects page.

### Google Authentication

- [ ] Add a new alternative login method: Google Authentication (Google Workspace Domain/Key must be configurable)


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
- [x] Vertical scrolling on all pages (Customers, Projects, Members, Settings, Teams, Users)
- [x] Move shared types to feature-specific types.ts files
- [x] Bug fix: Timeline team filtering now works correctly
- [x] Restored tooltips in Timeline header rows for adding/removing Milestones and Days-Off
- [x] Testing Infrastructure
  - [x] Set up Vitest testing framework for frontend and backend
  - [x] Install @testing-library/react and @testing-library/jest-dom
  - [x] Configure vitest.config.ts for both frontend (jsdom) and backend (node)
  - [x] Create test setup files with global configurations
  - [x] Create test utility files (custom render with providers, auth helpers)
  - [x] Create example tests: 11 frontend tests + 10 backend tests (21 total, all passing)
  - [x] Add test scripts to package.json (frontend, backend, and root)
  - [x] Create TESTING.md documentation with comprehensive guide
  - **Branch**: `feature/vitest-testing-infrastructure`
  - **Location**: `src/**/tests/*.test.tsx` and `src/**/tests/*.test.ts`
  - **Commands**: `npm test` (runs all), `npm run test:frontend`, `npm run test:backend`
