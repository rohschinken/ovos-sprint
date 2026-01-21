# Future Performance Optimization Options

**Status:** Documented for future implementation
**Date:** 2026-01-20
**Context:** After completing immediate fixes (Motion + date optimization)

These optimizations are kept on hold as backup options if performance targets are not met after implementing the immediate fixes.

---

## Option 1: Timeline Virtualization (High Impact)

**Expected Impact:** -100-150ms from rendering operations

### Overview
Implement `react-window` or `react-virtual` to only render visible timeline rows instead of all 2000+ cells.

### Implementation Plan

#### Step 1: Add Dependency
```bash
cd frontend
npm install react-window
npm install -D @types/react-window
```

#### Step 2: Update TimelineViewContent.tsx

**Current Implementation:**
```typescript
{filteredProjects.map((project) => (
  <div key={project.id}>
    <TimelineItemHeader ... />
    {expandedItems.has(project.id) &&
      visibleAssignments.map((assignment) => (
        <AssignmentRow ... />
      ))
    }
  </div>
))}
```

**Virtualized Implementation:**
```typescript
import { FixedSizeList as List } from 'react-window';

// Calculate row heights
const HEADER_HEIGHT = 40;
const ASSIGNMENT_HEIGHT = 36;

// Flatten the structure for virtualization
const virtualRows = useMemo(() => {
  const rows: VirtualRow[] = [];

  filteredProjects.forEach(project => {
    // Add project header row
    rows.push({
      type: 'header',
      id: `header-${project.id}`,
      data: project,
      height: HEADER_HEIGHT
    });

    // Add assignment rows if expanded
    if (expandedItems.has(project.id)) {
      const assignments = visibleAssignments[project.id];
      assignments.forEach(assignment => {
        rows.push({
          type: 'assignment',
          id: `assignment-${assignment.id}`,
          data: { project, assignment },
          height: ASSIGNMENT_HEIGHT
        });
      });
    }
  });

  return rows;
}, [filteredProjects, expandedItems, visibleAssignments]);

// Render function for virtual list
const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
  const row = virtualRows[index];

  return (
    <div style={style}>
      {row.type === 'header' ? (
        <TimelineItemHeader item={row.data} ... />
      ) : (
        <AssignmentRow assignment={row.data.assignment} ... />
      )}
    </div>
  );
};

// Render virtual list
<List
  height={window.innerHeight - 200} // Adjust based on layout
  itemCount={virtualRows.length}
  itemSize={(index) => virtualRows[index].height}
  width="100%"
  overscanCount={5} // Render 5 extra rows for smooth scrolling
>
  {Row}
</List>
```

#### Step 3: Handle Dynamic Row Heights

For variable row heights (some assignments may have different heights):

```typescript
import { VariableSizeList as List } from 'react-window';

const getRowHeight = (index: number) => {
  const row = virtualRows[index];
  return row.height;
};

<List
  height={window.innerHeight - 200}
  itemCount={virtualRows.length}
  itemSize={getRowHeight}
  width="100%"
  overscanCount={5}
>
  {Row}
</List>
```

#### Step 4: Maintain Scroll Position on Expand/Collapse

```typescript
const listRef = useRef<List>(null);

// Store scroll position
const scrollOffset = useRef(0);

const onScroll = ({ scrollOffset: offset }: { scrollOffset: number }) => {
  scrollOffset.current = offset;
};

// Restore scroll after expand/collapse
useEffect(() => {
  if (listRef.current) {
    listRef.current.scrollTo(scrollOffset.current);
  }
}, [expandedItems]);

<List
  ref={listRef}
  onScroll={onScroll}
  ...
>
```

### Files to Modify
- `frontend/src/components/timeline/TimelineViewContent.tsx`
- `frontend/package.json` (add react-window dependency)

### Testing Checklist
- [ ] Verify all rows render correctly when scrolling
- [ ] Expand/collapse maintains scroll position
- [ ] Performance improvement visible in React DevTools Profiler
- [ ] No visual glitches during fast scrolling
- [ ] Drag-to-assign still works correctly
- [ ] Hidden rows filter works correctly

### Estimated Effort
- **Implementation:** 3-4 hours
- **Testing:** 1-2 hours
- **Total:** 4-6 hours

---

## Option 2: Web Worker for Filtering (Medium Impact)

**Expected Impact:** -30-50ms from main thread blocking

### Overview
Offload heavy filtering operations to a Web Worker to prevent UI blocking.

### Implementation Plan

#### Step 1: Create Worker File

**Create:** `frontend/src/workers/timeline-filter.worker.ts`

```typescript
import { applyProjectFilters, applyMemberFilters } from '../lib/timeline-filters';

// Worker message types
type FilterMessage = {
  type: 'filterProjects' | 'filterMembers';
  data: {
    projects?: any[];
    members?: any[];
    projectAssignments: any[];
    teamMemberRelationships: any[];
    selectedTeamIds: number[];
    showTentative: boolean;
  };
};

self.onmessage = (e: MessageEvent<FilterMessage>) => {
  const { type, data } = e.data;

  const startTime = performance.now();

  let result;
  if (type === 'filterProjects') {
    result = applyProjectFilters(
      data.projects!,
      data.projectAssignments,
      data.teamMemberRelationships,
      data.selectedTeamIds,
      data.showTentative
    );
  } else {
    result = applyMemberFilters(
      data.members!,
      data.teamMemberRelationships,
      data.selectedTeamIds,
      data.projectAssignments,
      data.projects!,
      data.showTentative
    );
  }

  const duration = performance.now() - startTime;

  self.postMessage({
    type: 'result',
    result,
    duration
  });
};

export {};
```

#### Step 2: Create Hook to Use Worker

**Create:** `frontend/src/hooks/useWorkerFilter.ts`

```typescript
import { useEffect, useRef, useState } from 'react';
import FilterWorker from '../workers/timeline-filter.worker?worker';

export function useWorkerFilter() {
  const workerRef = useRef<Worker>();
  const [isFiltering, setIsFiltering] = useState(false);

  useEffect(() => {
    workerRef.current = new FilterWorker();

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const filterProjects = (data: any): Promise<any[]> => {
    return new Promise((resolve) => {
      if (!workerRef.current) {
        resolve([]);
        return;
      }

      setIsFiltering(true);

      const handleMessage = (e: MessageEvent) => {
        if (e.data.type === 'result') {
          setIsFiltering(false);
          workerRef.current?.removeEventListener('message', handleMessage);
          resolve(e.data.result);
        }
      };

      workerRef.current.addEventListener('message', handleMessage);
      workerRef.current.postMessage({
        type: 'filterProjects',
        data
      });
    });
  };

  return { filterProjects, isFiltering };
}
```

#### Step 3: Update useTimelineData

```typescript
// In useTimelineData.ts
const { filterProjects } = useWorkerFilter();

const filteredProjects = useMemo(() => {
  // Use worker instead of direct filtering
  filterProjects({
    projects,
    projectAssignments,
    teamMemberRelationships,
    selectedTeamIds,
    showTentative
  }).then(result => {
    // Update state with result
  });
}, [dependencies]);
```

### Pros & Cons

**Pros:**
- Completely non-blocking
- Can handle very large datasets
- Keeps UI responsive during heavy computation

**Cons:**
- Added complexity
- Data serialization overhead
- May not be faster for small datasets
- Harder to debug

### When to Use
- Only if dataset grows to 100+ projects or 50+ members
- Only if filtering operations consistently >100ms
- Current optimizations may make this unnecessary

---

## Option 3: Code Splitting for Animations (Low Impact)

**Expected Impact:** -50-100KB initial bundle, faster page load

### Overview
Lazy load Framer Motion components to reduce initial bundle size.

### Implementation

```typescript
// Instead of:
import { motion } from 'framer-motion';

// Use lazy loading:
import { lazy, Suspense } from 'react';

const MotionDiv = lazy(() =>
  import('framer-motion').then(mod => ({
    default: mod.motion.div
  }))
);

// In component:
<Suspense fallback={<div>Loading...</div>}>
  <MotionDiv animate={{ opacity: 1 }}>
    ...
  </MotionDiv>
</Suspense>
```

### When to Use
- Only if initial bundle size becomes a problem
- Only for animations that aren't immediately visible
- May cause flash of unstyled content

---

## Option 4: Memoize Timeline Cells (Medium Impact)

**Expected Impact:** -20-40ms by preventing unnecessary cell re-renders

### Implementation

Currently AssignmentRow is memoized, but individual date cells are not.

**Create:** `frontend/src/components/timeline/DateCell.tsx`

```typescript
import { memo } from 'react';

interface DateCellProps {
  date: Date;
  assignment: any;
  // ... other props
}

const DateCellComponent: React.FC<DateCellProps> = ({
  date,
  assignment,
  // ...
}) => {
  // Cell rendering logic
};

// Custom comparison function
const areEqual = (prev: DateCellProps, next: DateCellProps) => {
  return (
    prev.date === next.date &&
    prev.assignment.id === next.assignment.id &&
    prev.isDayAssigned === next.isDayAssigned &&
    prev.isDragRange === next.isDragRange
    // ... compare only necessary props
  );
};

export const DateCell = memo(DateCellComponent, areEqual);
```

### When to Use
- If React Profiler shows DateCell re-rendering frequently
- After implementing immediate fixes if violations persist

---

## Option 5: Debounce Filter Changes (Low Impact)

**Expected Impact:** -30-50ms by preventing rapid re-filtering

### Implementation

```typescript
// In DashboardPage.tsx
const [pendingFilters, setPendingFilters] = useState({
  selectedTeamIds,
  showTentative,
  hideEmptyRows
});

const debouncedFilters = useMemo(
  () => debounce((filters) => {
    // Apply filters
    setPendingFilters(filters);
  }, 300),
  []
);

// When user changes filters, debounce the update
const handleTeamToggle = (teamId: number) => {
  const newTeamIds = selectedTeamIds.includes(teamId)
    ? selectedTeamIds.filter(id => id !== teamId)
    : [...selectedTeamIds, teamId];

  debouncedFilters({ selectedTeamIds: newTeamIds, ... });
};
```

### When to Use
- If users are rapidly toggling filters
- Only if filtering is still slow after other optimizations

---

## Measurement & Monitoring

### Add Performance Budgets

**Create:** `frontend/performance-budgets.json`

```json
{
  "budgets": [
    {
      "metric": "clickHandler",
      "budget": 50,
      "unit": "ms"
    },
    {
      "metric": "filterOperation",
      "budget": 50,
      "unit": "ms"
    },
    {
      "metric": "initialRender",
      "budget": 100,
      "unit": "ms"
    }
  ]
}
```

### Add Performance Monitoring Hook

```typescript
// frontend/src/hooks/usePerformanceMonitor.ts
export function usePerformanceMonitor(operation: string) {
  const startTime = useRef(performance.now());

  useEffect(() => {
    const duration = performance.now() - startTime.current;

    if (duration > 50) {
      console.warn(`[Performance] ${operation} took ${duration.toFixed(2)}ms`);

      // Optional: Send to analytics
      // analytics.track('performance_violation', { operation, duration });
    }
  }, [operation]);
}
```

### Usage

```typescript
// In any component
const DashboardPage = () => {
  usePerformanceMonitor('DashboardPage render');

  // ... component code
};
```

---

## Decision Matrix

Use this to decide which optimization to implement next:

| Optimization | Impact | Effort | Risk | When to Use |
|-------------|--------|--------|------|-------------|
| **Virtualization** | ⭐⭐⭐⭐⭐ | 3-4h | Medium | >2000 cells rendered |
| **Web Worker** | ⭐⭐⭐ | 2-3h | Low | Filtering >100ms |
| **Code Splitting** | ⭐⭐ | 1h | Low | Bundle >1MB |
| **Memoize Cells** | ⭐⭐⭐ | 2h | Low | Many cell re-renders |
| **Debounce Filters** | ⭐⭐ | 30m | Very Low | Rapid filter changes |

---

## Success Metrics

After implementing immediate fixes, if violations persist, implement options in this priority order:

1. **If rendering is still slow (>100ms):** → Virtualization (Option 1)
2. **If filtering is still slow (>50ms):** → Web Worker (Option 2)
3. **If bundle size is large (>1MB):** → Code Splitting (Option 3)
4. **If cell re-renders are excessive:** → Memoize Cells (Option 4)
5. **If filter toggles are laggy:** → Debounce Filters (Option 5)

---

## Notes

- **Always measure before implementing** - Use React DevTools Profiler and Chrome DevTools
- **One optimization at a time** - Measure impact of each change
- **Consider diminishing returns** - Not all optimizations may be necessary
- **User experience first** - Don't sacrifice UX for marginal performance gains
