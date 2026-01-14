# OVOS Sprint - Feature Roadmap

## High Priority

_(Currently empty)_

## Medium Priority

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

## Low Priority

### Internationalization (i18n)
- [ ] Install and configure intlayer packages (`intlayer`, `react-intlayer`)
- [ ] Create `.content.ts` files for all pages and components
- [ ] Support German (de) and English (en) locales
- [ ] Replace hardcoded UI text with intlayer hooks
- [ ] Update date formatting in `lib/utils.ts` to use dynamic locale
- [ ] Configure intlayer build process
- [ ] Add language switcher component

**Current State**: Application uses German locale (`de-AT`) for date formatting but all UI text is in English.

### Component Refactoring
- [ ] Break down large components into smaller, focused units
  - Timeline.tsx (76KB) - extract sub-components
  - DashboardPage.tsx (21KB) - extract sections
- [ ] Create feature-based component directories with index.ts exports
- [ ] Move shared types to feature-specific types.ts files

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
