# Debug Logging Guide - Phase 4 Performance Optimizations

**Date:** 2026-01-21
**Purpose:** Verify Phase 4 optimizations are executing correctly

---

## What Was Added

Debug logging was added to verify that all Phase 4 optimizations are running:

### 1. Timeline Component Index Creation
**File:** `frontend/src/components/Timeline.tsx`

**What to Look For:**
```
[Performance Debug] Timeline indexes created: {
  dayAssignmentIndex: <number>,
  memberIndex: <number>,
  dayOffIndex: <number>,
  timestamp: <ISO timestamp>
}
```

**Expected Values:**
- `dayAssignmentIndex`: Number of unique assignment-date combinations (typically 500-2000)
- `memberIndex`: Number of team members (typically 10-50)
- `dayOffIndex`: Number of unique member-date day-off combinations (typically 50-500)

**When It Logs:** Once on initial Timeline render, and again whenever the underlying data changes

---

### 2. Optimized Lookup Functions
**File:** `frontend/src/components/Timeline.tsx`

#### isDayOff Function
**What to Look For:**
```
[Performance Debug] isDayOff called (1) - using O(1) lookup
[Performance Debug] isDayOff called (2) - using O(1) lookup
...
[Performance Debug] isDayOff called (5) - using O(1) lookup
```

**Expected Behavior:**
- Logs first 5 calls only (to avoid console spam)
- If you see these logs, the optimized O(1) lookup is being used
- Should be called hundreds/thousands of times per render

#### isNonWorkingDay Function
**What to Look For:**
```
[Performance Debug] isNonWorkingDay called (1) - using O(1) memberIndex lookup
[Performance Debug] isNonWorkingDay called (2) - using O(1) memberIndex lookup
...
[Performance Debug] isNonWorkingDay called (5) - using O(1) memberIndex lookup
```

**Expected Behavior:**
- Logs first 5 calls only
- Confirms memberIndex Map is being used instead of array.find()

#### getDayAssignmentId Function
**What to Look For:**
```
[Performance Debug] getDayAssignmentId called (1) - using O(1) dayAssignmentIndex lookup
[Performance Debug] getDayAssignmentId called (2) - using O(1) dayAssignmentIndex lookup
...
```

**Expected Behavior:**
- Logs first 5 calls only
- Called when deleting assignments or checking assignment state
- Uses dayAssignmentIndex Map for instant lookups

---

### 3. DashboardPage Optimizations
**File:** `frontend/src/pages/DashboardPage.tsx`

#### Assignment Indexes Pre-computation
**What to Look For:**
```
[Performance Debug] assignmentIndexes computed: {
  indexSize: <number>,
  duration: "<X>ms",
  timestamp: <ISO timestamp>
}
```

**Expected Values:**
- `indexSize`: Number of assignments with day assignments (typically 100-500)
- `duration`: Should be <10ms (ideally <5ms)

**When It Logs:** On initial load and whenever dayAssignments or dateSet changes

#### Visible Items Calculation
**What to Look For:**
```
[Performance Debug] visibleItems calculated: {
  viewMode: "by-project" | "by-member",
  hideEmptyRows: true | false,
  totalItems: <number>,
  visibleItems: <number>,
  duration: "<X>ms",
  timestamp: <ISO timestamp>
}
```

**Expected Values:**
- `duration`: Should be <20ms (previously >150ms)
- `totalItems`: Total projects or members in filtered list
- `visibleItems`: Number of items with assignments in date range

**Critical:** This is where we expect to see the biggest improvement. If duration is still >50ms, the optimization may not be working correctly.

---

### 4. AssignmentRow Cell Pre-computation
**File:** `frontend/src/components/timeline/AssignmentRow.tsx`

**What to Look For:**
```
[Performance Debug] AssignmentRow dateProperties (by-project) pre-computed: {
  projectId: <number>,
  memberId: <number>,
  cellCount: <number>,
  duration: "<X>ms"
}
```

**Expected Values:**
- `cellCount`: Number of date cells (typically 30-90)
- `duration`: Only logs if >5ms (should rarely appear if optimization is working)

**When It Logs:**
- Only when duration exceeds 5ms threshold
- If you see many of these, it means cell rendering is still slow
- Each row should pre-compute all date properties once

---

## How to Test

### Step 1: Clear All Caches
```bash
# Clear browser cache (hard refresh)
Ctrl+Shift+R (or Cmd+Shift+R on Mac)

# Clear Vite cache
cd frontend
rm -rf node_modules/.vite
```

### Step 2: Open Console
1. Open Chrome DevTools (F12)
2. Navigate to Console tab
3. Filter for "[Performance Debug]" to see only our logs

### Step 3: Load Timeline
1. Navigate to Dashboard/Timeline view
2. Observe console output
3. Check that all debug logs appear

### Step 4: Test Interactions

#### Test Filter Changes (visibleItems optimization)
1. Toggle "Show weekends" checkbox
2. Check console for `visibleItems calculated` log
3. Verify duration is <20ms

#### Test Hide Empty Rows (visibleItems optimization)
1. Toggle "Hide empty rows" checkbox
2. Check console for `visibleItems calculated` log
3. Verify duration is <20ms

#### Test Assignment Deletion (getDayAssignmentId optimization)
1. Click to delete an assignment
2. Check console for `getDayAssignmentId called` logs
3. Should see optimized O(1) lookup being used

---

## What Success Looks Like

### ✅ Good Performance
```
[Performance Debug] Timeline indexes created: { dayAssignmentIndex: 1243, memberIndex: 32, dayOffIndex: 156 }
[Performance Debug] isDayOff called (1) - using O(1) lookup
[Performance Debug] isNonWorkingDay called (1) - using O(1) memberIndex lookup
[Performance Debug] assignmentIndexes computed: { indexSize: 345, duration: "3.21ms" }
[Performance Debug] visibleItems calculated: { viewMode: "by-project", hideEmptyRows: true, totalItems: 87, visibleItems: 52, duration: "12.45ms" }
```

**Key Indicators:**
- visibleItems duration: <20ms ✅
- assignmentIndexes duration: <10ms ✅
- Optimized lookup functions being called ✅
- Few or no AssignmentRow logs (means pre-computation is fast) ✅

### ⚠️ Poor Performance (Optimizations Not Working)
```
[Performance Debug] Timeline indexes created: { dayAssignmentIndex: 0, memberIndex: 0, dayOffIndex: 0 }
[Performance Debug] visibleItems calculated: { ..., duration: "187.23ms" }
[Performance Debug] AssignmentRow dateProperties pre-computed: { ..., duration: "45.67ms" }
[Performance Debug] AssignmentRow dateProperties pre-computed: { ..., duration: "43.21ms" }
...
```

**Warning Signs:**
- Empty indexes (size: 0) ⚠️
- visibleItems duration: >50ms ⚠️
- Many AssignmentRow logs with high durations ⚠️
- Missing optimized function call logs ⚠️

---

## Troubleshooting

### If Index Sizes Are 0
**Problem:** Indexes are being created but have no data

**Possible Causes:**
1. Data not loaded yet (check if logs appear after data loads)
2. Data structure mismatch (check API response format)
3. Key format issue (check date formatting)

**Solution:** Add breakpoint in index creation code to inspect data

### If visibleItems Duration Still High (>50ms)
**Problem:** Optimization not reducing complexity

**Possible Causes:**
1. assignmentIndexes not being used (check implementation)
2. Still doing nested loops elsewhere
3. Other bottlenecks in filter logic

**Solution:** Use React DevTools Profiler to identify which component is slow

### If Optimized Function Logs Don't Appear
**Problem:** Functions not being called, or old implementation still in use

**Possible Causes:**
1. Build not deployed (restart dev server)
2. Browser cached old code (hard refresh)
3. Different code path being executed

**Solution:**
1. Restart dev server
2. Hard refresh browser (Ctrl+Shift+R)
3. Check Network tab to verify new bundle loaded

---

## Expected Performance Impact

Based on Phase 4 optimizations, you should see:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| visibleItems calculation | >150ms | <20ms | **87% faster** |
| isDayOff per call | O(n) ~10ms | O(1) <0.1ms | **100x faster** |
| isNonWorkingDay per call | O(n) ~10ms | O(1) <0.1ms | **100x faster** |
| getDayAssignmentId per call | O(n) ~10ms | O(1) <0.1ms | **100x faster** |
| AssignmentRow render | 15,000 function calls | 3,000 function calls | **80% reduction** |

---

## Next Steps

1. **If logs show optimizations are working but performance hasn't improved:**
   - The bottleneck may be elsewhere (React re-renders, animations, etc.)
   - Consider implementing FUTURE_OPTIMIZATIONS.md Option 1 (Virtualization)
   - Use React DevTools Profiler to identify remaining bottlenecks

2. **If logs show optimizations are NOT working:**
   - Index sizes are 0
   - Duration times are still high
   - Missing expected log messages
   - Report findings and we'll investigate further

3. **If performance HAS improved:**
   - Run new Chrome trace
   - Compare with baseline (342 long tasks, 185ms avg)
   - Document improvements
   - Remove debug logs before production deploy

---

## Removing Debug Logs

Once testing is complete, remove debug logs by:

1. Search for `[Performance Debug]` in codebase
2. Remove all `console.log` statements containing this prefix
3. Remove call counter useRef declarations
4. Remove performance.now() timing code
5. Rebuild and verify no console spam

**Files to Clean:**
- `frontend/src/components/Timeline.tsx`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/components/timeline/AssignmentRow.tsx`
