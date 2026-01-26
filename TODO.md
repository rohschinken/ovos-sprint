# OVOS Sprint - Feature Roadmap

## High Priority

### Chore: API and UI constraints
- [ ] Display Settings: prevent users from entering exorbitant high numbers into "Previous Days" and "Next Days" (both API and in the UI). (min: 0, max: 999)
- [ ] Write a migration that clamps the existing user settings to the new min and max values.

## Medium Priority

### Feature: Allow skipping non-working days in multi-day assignment creation
- [ ] When creating a multi-day assingment that overlaps non-working days AND if "show non-working-day warning" option is enabled, give the user the option to either: 1) "Cancel": aborts the whole opration (do not create any assignments) 2) Create one large assignment-bar that overlaps non-wokring days (as usual) 3) "Skip non-working days": Creates the assignment but skips all non-working days - this can result in the creastion of multiple not-connected assignments
- [ ] All assigments on non-working days (holidys, days-off and vacation days) should appear narrow (zero height and only 1px border - so it appears basically as a horizontal line)

## Low Priority

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
