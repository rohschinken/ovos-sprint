# Deployment Guide - Performance Optimization Branch

**Branch:** `feature/performance-phase1-batch-operations`
**Status:** Ready for production testing
**Date:** 2026-01-21

---

## Branch Summary

This branch contains all Phase 1-4 performance optimizations including:
- ✅ Batch assignment operations (Phase 1)
- ✅ Optimized filtering algorithms (Phase 2)
- ✅ Drag context isolation (Phase 2.5)
- ✅ Expand All button fix (Phase 3)
- ✅ Immediate fixes (Motion + date optimization)
- ✅ Index-based lookups (Phase 4.1-4.2)
- ✅ Pre-computed cell styles (Phase 4.4)
- ✅ Loading state fix (Phase 4.6)

**Total commits:** 13 commits
**Documentation:** 6 comprehensive markdown files

---

## On Production Server

### Step 1: Pull Latest Code

```bash
cd /path/to/ovos-sprint
git fetch origin
git checkout feature/performance-phase1-batch-operations
git pull origin feature/performance-phase1-batch-operations
```

### Step 2: Install Dependencies (if needed)

```bash
# Backend (no new dependencies)
cd backend
npm install

# Frontend (no new dependencies)
cd ../frontend
npm install
```

### Step 3: Build Frontend

```bash
cd frontend
npm run build
```

**Expected output:**
```
✓ 2925 modules transformed.
dist/index.html                   0.60 kB │ gzip:   0.43 kB
dist/assets/index-B5mS5Y5x.css   43.39 kB │ gzip:   8.20 kB
dist/assets/index-CwwFjDkz.js   712.81 kB │ gzip: 219.39 kB
✓ built in 4-8s
```

### Step 4: Deploy Frontend Build

**Option A: Copy to Backend Public Folder**
```bash
# From project root
rm -rf backend/public/*
cp -r frontend/dist/* backend/public/
```

**Option B: Copy to Web Server**
```bash
# If using nginx or apache
cp -r frontend/dist/* /var/www/ovos-sprint/
```

### Step 5: Restart Backend (if needed)

```bash
cd backend

# Using PM2
pm2 restart ovos-sprint

# Or using systemd
sudo systemctl restart ovos-sprint

# Or direct
npm start
```

### Step 6: Verify Deployment

1. Navigate to your production URL
2. Open Chrome DevTools (F12)
3. Check Console tab
4. Should see debug logs (or no errors if logs removed)

---

## Expected Behavior in Production

### What You Should See

**Console (if debug logs still present):**
```
[Performance Debug] Timeline indexes created: {dayAssignmentIndex: XXX, ...}
[Performance Debug] visibleItems calculated: {duration: '0.00ms'}
```

**Performance:**
- ✅ Fast initial load (no flickering)
- ✅ Instant filter changes (<1ms)
- ✅ Smooth drag operations
- ✅ No violations or significantly fewer violations

### What You Should NOT See

**No more:**
- ❌ `scheduler.development.js` violations (dev-only file)
- ❌ 215ms loadend violations (render cascade fixed)
- ❌ >150ms filter click violations (calculations instant)
- ❌ Empty data renders (0/0/0 indexes)
- ❌ 40+ Timeline renders on load

---

## Testing Checklist on Production

### Initial Load
- [ ] Page loads within 2-3 seconds
- [ ] No console errors
- [ ] Timeline appears fully populated (no flickering)
- [ ] No excessive violations in console

### Filter Operations
- [ ] Click "Show weekends" - instant response
- [ ] Toggle "Hide empty rows" - instant response
- [ ] Change team filters - smooth updates
- [ ] Check console for visibleItems logs (if debug enabled)

### Assignment Operations
- [ ] Drag to create 20-day assignment - smooth operation
- [ ] Delete assignments - instant removal
- [ ] Check console for violations - should be minimal

### User Experience
- [ ] Everything feels snappy and responsive
- [ ] No lag when interacting with timeline
- [ ] Drag operations smooth
- [ ] No layout shifts during load

---

## Performance Comparison

### Before Phase 4
```
Initial load: 40+ renders with empty/partial data
Filter changes: >150ms
Long tasks: 342 events (>50ms)
Violations: 215ms loadend, 159-215ms clicks
```

### After Phase 4 (Expected)
```
Initial load: 1 render with complete data
Filter changes: <1ms
Long tasks: <50 events (estimated)
Violations: <100ms user interactions only
```

---

## Database Migrations

**No database changes** - This branch only includes frontend optimizations and algorithm improvements. Your existing database works as-is.

---

## Rollback Plan

If you encounter issues:

### Quick Rollback
```bash
git checkout main  # or your previous stable branch
cd frontend
npm run build
cp -r dist/* backend/public/
pm2 restart ovos-sprint
```

### Partial Rollback

If you want to keep some optimizations but revert specific phases, see rollback instructions in:
- `C:\Users\af\.claude\plans\elegant-petting-pnueli.md`

---

## Debug Logging

### Current State
Debug logging is **ENABLED** in these files:
- `frontend/src/components/Timeline.tsx`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/components/timeline/AssignmentRow.tsx`

All logs are prefixed with `[Performance Debug]` for easy filtering.

### To Remove Debug Logs (Optional)

After confirming everything works, you can remove debug logging:

```bash
# Search for all debug logs
cd frontend/src
grep -r "\[Performance Debug\]" .

# Files to edit:
# - components/Timeline.tsx (lines 153-159, 166-169, 180-183, 300-304)
# - pages/DashboardPage.tsx (lines 129, 143-148, 155, 185-194)
# - components/timeline/AssignmentRow.tsx (lines 146, 159-167, 278, 291-299)
```

Remove the `console.log` statements but **keep the actual optimizations** (indexes, useMemo, etc.).

---

## Monitoring

### What to Monitor

**First 24 Hours:**
- Server error logs for new errors
- User feedback on performance
- Any console errors in browser
- Response times for API endpoints

**Metrics to Track:**
- Page load time (should be faster)
- Time to interactive (should be faster)
- Server CPU/memory (should be same or lower)
- API response times (should be same or better)

---

## Support Files

All documentation is in the repository:

1. **PERFORMANCE_ANALYSIS.md** - Original trace analysis
2. **FUTURE_OPTIMIZATIONS.md** - Backup optimization options
3. **PERFORMANCE_OPTIMIZATION_SUMMARY.md** - Complete summary
4. **PERFORMANCE_ROOT_CAUSE_ANALYSIS.md** - Root cause findings
5. **PHASE_4_RESULTS.md** - Phase 4 results and evidence
6. **DEBUG_LOGGING_GUIDE.md** - How to interpret debug logs

---

## Success Criteria

✅ **Deployment is successful if:**
- Application loads without errors
- Timeline is responsive and fast
- No increase in server errors
- User experience is improved
- Fewer console violations (or none)

⚠️ **Needs investigation if:**
- New errors appear in console
- Application feels slower
- Timeline doesn't load correctly
- Violations are worse than before

---

## Contact

If you encounter issues during deployment:
1. Check server logs for errors
2. Check browser console for errors
3. Review this deployment guide
4. Check rollback plan above

---

## Post-Deployment

After confirming everything works in production:

1. **Optional:** Remove debug logging (see section above)
2. **Optional:** Merge to `next` or `main` branch
3. **Optional:** Tag release: `git tag v1.x.x-performance`
4. **Consider:** Code splitting (see TODO.md Low Priority)

---

## Branch Information

**GitHub URL:** https://github.com/rohschinken/ovos-sprint/tree/feature/performance-phase1-batch-operations

**Create Pull Request:** https://github.com/rohschinken/ovos-sprint/pull/new/feature/performance-phase1-batch-operations

**Commits:** 13 performance-related commits
**Documentation:** 6 markdown files
**Testing:** Tested locally with debug logging confirmation
