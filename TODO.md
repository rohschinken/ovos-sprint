# OVOS Sprint - Feature Roadmap

## High Priority

## Medium Priority

### Feature: moving assignment blocks and changing start/end date of block

- [ ] it must be possible to move assignment blocks with the mouse. Moving an assignment block should work when clicking and draggin the mouse while holding the ALT key down. Moving an assignment block must only work horizontally, ➡️ in the same row.
- [ ] Change start and end date of an assignment block. The assignment block edit popover already shows the start and end date. Allow changing the dates individually in this edit popover.
- [ ] A block must NEVER have an invalid state (e.g. negative date range or the same day being assigned to multiple assignment blocks)
- [ ] if by moving the block or by changing it's dates the block will overlap with other blocks, apply the same merge rules we already have in place when creating new blocks.
- [ ] all of the above described operations must work in per-member and in per-project mode.

## Low Priority

### Feature: add a new toggle for abstract week view

- [ ] TBD

### Code Splitting & Bundle Optimization

- [ ] Implement route-based code splitting with React lazy/Suspense
- [ ] Split heavy libraries (Framer Motion, date libraries) into separate chunks
- [ ] Configure Vite rollupOptions for manual chunking
- [ ] Lazy load admin-only components for non-admin users
- [ ] Measure bundle size reduction and initial load time improvement

**Current State**: Single 712KB JavaScript bundle. Bundle size warning from Vite suggests splitting.

**Expected Impact**:

- Initial bundle: 712KB → ~400KB (main) + smaller route chunks
- Faster Time to Interactive (TTI)
- Better Lighthouse score
- Improved mobile performance

**Note**: Runtime performance is already optimized (Phase 4 complete). Code splitting improves initial page load, not runtime violations.

### Google Authentication

- [ ] Add a new alternative login method: Google Authentication (Google Workspace Domain/Key must be configurable)

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
