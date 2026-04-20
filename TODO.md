# OVOS Sprint - Feature Roadmap

## Future Backlog

### Timeline: Code Deduplication in TimelineViewContent (Optional)

**Severity**: Low | **Risk**: Medium | **Files**: `TimelineViewContent.tsx`

**Problem**: The `renderParentRow` function in `TimelineViewContent.tsx` has separate branches for by-project and by-member `TimelineItemHeader` props. The `AssignmentRow` rendering is now unified via the virtualizer loop, but the header still diverges.

> **Review note:** The actual differences between branches are substantial:
>
> | Aspect | By-Project | By-Member |
> |--------|-----------|-----------|
> | **`canEdit` prop** | `canEditProject(project.id)` | `isAdmin` |
> | **Header extra props** | `milestones`, `onMilestoneToggle` | `dayOffs`, `onDayOffToggle`, `projects`, `hasOverlap`, `isNonWorkingDay` |
>
> A generic function would still need internal branches. Whether deduplication is worthwhile depends on how often these branches diverge.

---

### Timeline: Horizontal Column Virtualization (Future)

**Severity**: Medium | **Risk**: High

**Problem**: Each visible row renders all date cells (60+ for wide date ranges). Row virtualization (now done) reduces the number of rows, but each row still has full-width DOM. For very wide date ranges (90+ days), column virtualization via a second `useVirtualizer({ horizontal: true })` sharing the same scroll container could reduce per-row DOM node count.

**Prerequisite**: Measure actual performance with row virtualization alone. Only pursue if profiling shows date cells as a bottleneck.

---

### Other Ideas

- **Error Boundary**: Wrap the Timeline in an error boundary to gracefully handle API failures
- **Optimistic updates**: Use React Query's `onMutate` for faster perceived responsiveness on drag operations
- **Prefetch adjacent date ranges**: Prefetch `startDate ± 30 days` when user is in the middle of a large date range
- **Scroll-to-today**: Add a `ref` on the scroll container (now available in `TimelineViewContent`) and a button/shortcut to scroll to today's column
