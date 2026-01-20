# OVOS Sprint - Feature Roadmap

## High Priority

## Medium Priority

### regression: overlap indicator now shown

- [x] A regression bug from when the Timeline View was refactored:  narrow assignment bar is not shown on collapsed member and project rowss (this includes the overlap indicator). 

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
- [x] Card View Removal
  - [x] Removed card view from Teams, Members, Customers, and Projects pages
  - [x] Simplified UI to list view only
  - [x] Removed 550+ lines of code
  - **Branch**: `feature/remove-card-view` → merged to `next`
- [x] List View Sorting
  - [x] Created reusable `useSort` hook for generic sorting
  - [x] Created `SortableTableHeader` component with visual indicators
  - [x] Added sorting to Teams (name, created date)
  - [x] Added sorting to Members (name, email, added date)
  - [x] Added sorting to Customers (name, manager, created date)
  - [x] Added sorting to Projects (name, customer, status, manager)
  - [x] Fixed sorting bugs in admin sections
  - **Branch**: `feature/add-list-view-sorting` → merged to `next`
- [x] Archived Project Status
  - [x] Added 'archived' as third project status (Confirmed, Tentative, Archived)
  - [x] Inline status editing with Select dropdown in list view
  - [x] "Show archived projects" toggle (disabled by default)
  - [x] Archived projects filtered from Projects page by default
  - [x] Archived projects always filtered from Timeline view
  - [x] Gray color and Archive icon for archived status
  - [x] Updated backend schema and validation
  - **Branch**: `feature/add-archived-projects` → merged to `next`
