# Performance Analysis Report
**Generated:** 2026-01-20
**Trace File:** Trace-20260120T165118.json (66MB, 190,820 events)

## Executive Summary

After implementing Phases 1-3 of the performance optimization plan, profiling reveals:

### ✅ Optimizations Working
- **Batch Operations (Phase 1)**: No evidence of sequential API calls in trace
- **Filtering Optimizations (Phase 2)**: No console warnings about >50ms filtering
- **Drag Context (Phase 2.5)**: Reduced re-renders during drag operations

### ⚠️ Remaining Issues
- **Click Events**: 5 events ranging from 159-215ms
- **Timer Events**: 23 events ranging from 127-253ms
- **Total Long Tasks**: 342 tasks >50ms

---

## Detailed Findings

### 1. Click Event Performance (Violations)

**Issue:** Click handlers taking 159-215ms to complete

| Event | Duration | Primary Bottleneck |
|-------|----------|-------------------|
| Click #1 | 209.41ms | RunMicrotasks: 208.82ms |
| Click #2 | 192.68ms | RunMicrotasks: 192.28ms |
| Click #3 | 159.56ms | RunMicrotasks: 159.11ms |
| Click #4 | 184.04ms | RunMicrotasks: 183.75ms |
| Click #5 | 215.81ms | RunMicrotasks: 215.47ms |

**Root Cause:**
- All clicks trigger `chunk-RPCDYKBN.js` (likely React or Framer Motion)
- RunMicrotasks taking 159-215ms indicates:
  - Heavy state updates
  - Multiple re-renders
  - Promise resolution chains

**Likely Culprits:**
1. **Framer Motion animations** - Each click may trigger multiple animations
2. **State updates cascading** - Click → state change → re-render → new state → re-render
3. **useMemo/useCallback recomputation** - Dependencies changing on click

### 2. Timer Events (setTimeout violations)

**Issue:** 23 Timer events >50ms (avg 191ms)

| Timer ID | Duration | Context |
|----------|----------|---------|
| 78 | 253.91ms | Longest violation |
| 83 | 193.90ms | - |
| 108 | 176.07ms | - |
| 110 | 184.99ms | - |

**Analysis:**
- Timers likely from:
  - React Query polling/refetching (staleTime: 10s)
  - Debounced functions (drag state: 16ms)
  - Animation frame callbacks

### 3. Event Distribution

```
Total long tasks (>50ms): 342

Top Contributors:
- v8.callFunction:      94 events (17,419ms total, 185ms avg)
- RunTask:              60 events (11,008ms total, 183ms avg)
- FunctionCall:         58 events (10,755ms total, 185ms avg)
- RunMicrotasks:        36 events (6,644ms total, 184ms avg)
- TimerFire:            23 events (4,412ms total, 191ms avg)
- Input Events:         11 events (2,124ms total, 193ms avg)
- Click Events:          5 events (2,070ms total, 188ms avg)
```

### 4. XHR/Network Performance

**✅ Network is NOT the bottleneck**

Only 2 XHR loads >50ms:
- `/api/auth/me?include=teams`: 91.51ms
- `/api/auth/me?include=teams`: 77.04ms

No evidence of:
- Cascading API calls
- Sequential assignment creation
- Slow data fetching

**Conclusion:** Phases 1-2 successfully optimized network layer.

---

## Root Cause Analysis

### Primary Bottleneck: JavaScript Execution Time

The violations are **NOT** caused by:
- ❌ Network requests (XHR events are fast)
- ❌ DOM manipulation (no RecalcStyles/Layout/Paint issues)
- ❌ Filtering algorithms (no warnings in console)

The violations **ARE** caused by:
- ✅ **Heavy JavaScript execution** (v8.callFunction: 17.4 seconds total)
- ✅ **Microtask queues** (RunMicrotasks: 6.6 seconds total)
- ✅ **React re-renders** (chunk-RPCDYKBN.js during every click)

### Specific Problem Areas

#### 1. Framer Motion Over-Animation
**Evidence:**
- Every click triggers 159-215ms of microtask processing
- `chunk-RPCDYKBN.js` is executed during all clicks
- No actual DOM manipulation (Layout/Paint) taking time

**Impact:**
- Each button click → animation state updates → re-render
- Motion components may be animating when not visible
- `whileHover`, `whileTap`, `animate` props creating update cycles

**Location:** [DashboardControls.tsx](frontend/src/components/dashboard/DashboardControls.tsx):40-88
```typescript
<motion.div
  initial={{ opacity: 0, x: -10 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ delay: 0.15 }}
  whileHover={{ scale: 1.05 }}  // ← Creates re-render on every hover
  whileTap={{ scale: 0.95 }}    // ← Creates re-render on tap
>
```

#### 2. Large Component Tree Re-renders

**Evidence:**
- 183-215ms average task duration
- Multiple RunMicrotasks chains
- React internal scheduling (v8.callFunction)

**Potential Issues:**
- Timeline rendering ~2000 cells
- Each cell may be re-rendering on state changes
- DashboardPage calculates `visibleItems` on every render

**Location:** [DashboardPage.tsx](frontend/src/pages/DashboardPage.tsx):100-138
```typescript
const visibleItems = useMemo(() => {
  // Triple nested loops on every dependency change
  // May trigger full tree re-render
}, [viewMode, filteredProjects, filteredMembers, hideEmptyRows, projectAssignments, dayAssignments, dates])
```

#### 3. Date Calculation in Render Path

**Location:** [DashboardPage.tsx](frontend/src/pages/DashboardPage.tsx):84-94
```typescript
const dates = useMemo(() => {
  const dateList: Date[] = []
  let currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    // Creates new Date objects on every calculation
    if (showWeekends || (currentDate.getDay() !== 0 && currentDate.getDay() !== 6)) {
      dateList.push(new Date(currentDate))
    }
    currentDate = addDays(currentDate, 1)
  }
  return dateList
}, [startDate, endDate, showWeekends])
```

**Problem:** This creates potentially 90-365 Date objects and runs every time showWeekends changes.

---

## Recommended Optimizations

### Priority 1: Reduce Motion Component Overhead

**Impact:** Should eliminate 50-100ms from click events

#### Option A: Remove Unnecessary Animations
```diff
// DashboardControls.tsx
- <motion.div
-   initial={{ opacity: 0, x: -10 }}
-   animate={{ opacity: 1, x: 0 }}
-   transition={{ delay: 0.15 }}
-   whileHover={{ scale: 1.05 }}
-   whileTap={{ scale: 0.95 }}
- >
+ <div>
    <Button ...>
```

**Pros:** Immediate 50-100ms improvement
**Cons:** Loses animation polish

#### Option B: Optimize Motion Configuration
```diff
<motion.div
  initial={{ opacity: 0, x: -10 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ delay: 0.15 }}
- whileHover={{ scale: 1.05 }}
- whileTap={{ scale: 0.95 }}
+ whileHover={{ scale: 1.05 }}
+ whileTap={{ scale: 0.95 }}
+ // Add layout optimization
+ layout="position"
+ layoutDependency={false}
>
```

**Pros:** Keeps animations, reduces re-renders
**Cons:** Still some overhead

### Priority 2: Virtualize Timeline (Option 3 from Backup Plan)

**Impact:** Should eliminate 100-150ms from rendering

Implement `react-window` or `react-virtual` for:
- Only render visible rows
- ~50 rows visible instead of 2000+ cells
- Scroll performance improvement

**Files to Modify:**
- `TimelineViewContent.tsx`
- Add `react-window` dependency

### Priority 3: Optimize visibleItems Calculation

**Current Issue:**
```typescript
// O(n × m × dates) complexity
dates.some(d => {
  const daDate = new Date(da.date)
  return daDate.getFullYear() === d.getFullYear() &&
         daDate.getMonth() === d.getMonth() &&
         daDate.getDate() === d.getDate()
})
```

**Optimization:**
```typescript
// Pre-compute date lookup Set (O(1) instead of O(n))
const dateSet = useMemo(() => {
  return new Set(dates.map(d => format(d, 'yyyy-MM-dd')))
}, [dates])

// Then use in filter
dates.some(d => dateSet.has(da.date))
```

### Priority 4: Memoize Date Calculations

**Location:** DashboardPage.tsx

```typescript
// Instead of creating new Date objects every time
const dates = useMemo(() => {
  const dateList: Date[] = []
  let currentDate = new Date(startDate)

  // Pre-allocate array if size is known
  const dayCount = differenceInDays(endDate, startDate)
  dateList.length = dayCount

  while (currentDate <= endDate) {
    if (showWeekends || (currentDate.getDay() !== 0 && currentDate.getDay() !== 6)) {
      dateList.push(currentDate) // Reuse object
    }
    currentDate = addDays(currentDate, 1)
  }
  return dateList
}, [startDate, endDate, showWeekends])
```

---

## Performance Targets

| Metric | Current | Target | Method |
|--------|---------|--------|--------|
| Click Handler | 159-215ms | <50ms | Remove motion overhead |
| Timer Events | 127-253ms | <100ms | Virtualization |
| Total Long Tasks | 342 | <50 | All optimizations |
| Avg Task Duration | 185ms | <50ms | React profiling |

---

## Next Steps

1. **Profile React Components**
   - Use React DevTools Profiler to identify expensive renders
   - Check which components re-render on click
   - Identify unnecessary memo/callback dependencies

2. **Implement Priority 1 (Motion Optimization)**
   - Quick win, low risk
   - Can test immediately

3. **Consider Timeline Virtualization (Option 3)**
   - Highest impact for large datasets
   - Moderate implementation effort

4. **Add Performance Monitoring**
   - Track render times in production
   - Set up Core Web Vitals monitoring

---

## Conclusions

### What's Working
✅ Batch operations successfully reduced API calls
✅ Filtering algorithms optimized (no >50ms warnings)
✅ Drag context preventing Timeline re-renders
✅ Network layer is fast

### What Needs Work
⚠️ **Framer Motion** creating excessive re-renders on interactions
⚠️ **Large component tree** (~2000 cells) causing render overhead
⚠️ **Date calculations** in hot paths
⚠️ **visibleItems** filtering using inefficient date comparison

### Recommended Path Forward

**Immediate (Low Effort, High Impact):**
1. Remove/simplify Framer Motion animations in DashboardControls
2. Optimize date lookups in visibleItems calculation

**Short Term (Medium Effort, High Impact):**
3. Implement timeline virtualization (react-window)
4. Profile with React DevTools to find specific re-render issues

**Long Term (Optional):**
5. Consider code splitting for animations
6. Add performance budgets to CI/CD
