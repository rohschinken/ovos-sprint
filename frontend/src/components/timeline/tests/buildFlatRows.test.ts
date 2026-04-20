/**
 * Tests for buildFlatRows — flattens the nested project/member → assignment
 * hierarchy into a single array for the row virtualizer.
 */
import { describe, it, expect } from 'vitest'
import { buildFlatRows } from '../buildFlatRows'
import type { Project, TeamMember, ProjectAssignment } from '@/types'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const members: TeamMember[] = [
  { id: 1, firstName: 'Alice', lastName: 'A', avatarUrl: null, workSchedule: '{}', createdAt: '' },
  { id: 2, firstName: 'Bob',   lastName: 'B', avatarUrl: null, workSchedule: '{}', createdAt: '' },
]

const projects: Project[] = [
  { id: 10, customerId: 1, name: 'Alpha', status: 'confirmed',  managerId: null, createdAt: '' },
  { id: 20, customerId: 1, name: 'Beta',  status: 'tentative',  managerId: null, createdAt: '' },
  { id: 30, customerId: 2, name: 'Gamma', status: 'confirmed',  managerId: null, createdAt: '' },
]

const assignments: ProjectAssignment[] = [
  { id: 100, projectId: 10, teamMemberId: 1, createdAt: '' },
  { id: 101, projectId: 10, teamMemberId: 2, createdAt: '' },
  { id: 102, projectId: 20, teamMemberId: 1, createdAt: '' },
  { id: 103, projectId: 30, teamMemberId: 2, createdAt: '' },
]

// dayAssignments in the real app have a nested `projectAssignment` object
// that `isDayAssigned` checks via `da.projectAssignment?.id`
const dayAssignments = [
  { id: 1000, projectAssignmentId: 100, projectAssignment: { id: 100 }, date: '2026-04-15', comment: null, createdAt: '' },
  { id: 1001, projectAssignmentId: 101, projectAssignment: { id: 101 }, date: '2026-04-15', comment: null, createdAt: '' },
  // assignment 102 has NO day assignments in range
  { id: 1002, projectAssignmentId: 103, projectAssignment: { id: 103 }, date: '2026-04-16', comment: null, createdAt: '' },
] as any[]

const dates = [new Date('2026-04-15'), new Date('2026-04-16')]

function makeMemberById() {
  const m = new Map<number, TeamMember>()
  members.forEach(mm => m.set(mm.id, mm))
  return m
}

function makeProjectById() {
  const m = new Map<number, Project>()
  projects.forEach(p => m.set(p.id, p))
  return m
}

const baseParams = {
  projectAssignments: assignments,
  dayAssignments,
  dates,
  memberById: makeMemberById(),
  projectById: makeProjectById(),
  hideEmptyRows: false,
  showTentative: true,
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('buildFlatRows', () => {
  describe('basic flattening', () => {
    it('returns empty array for empty items', () => {
      const rows = buildFlatRows({
        ...baseParams,
        viewMode: 'by-project',
        items: [],
        expandedItems: new Set(),
      })
      expect(rows).toEqual([])
    })

    it('returns one parent row per collapsed item', () => {
      const rows = buildFlatRows({
        ...baseParams,
        viewMode: 'by-project',
        items: projects,
        expandedItems: new Set<number>(), // all collapsed
      })
      expect(rows).toHaveLength(3)
      expect(rows.every(r => r.type === 'parent')).toBe(true)
    })

    it('returns parent + children for expanded item (by-project)', () => {
      const rows = buildFlatRows({
        ...baseParams,
        viewMode: 'by-project',
        items: [projects[0]], // Project Alpha (id=10) has 2 assignments
        expandedItems: new Set([10]),
      })
      expect(rows).toHaveLength(3) // 1 parent + 2 children
      expect(rows[0].type).toBe('parent')
      expect(rows[1].type).toBe('child')
      expect(rows[2].type).toBe('child')
    })

    it('returns parent + children for expanded item (by-member)', () => {
      const rows = buildFlatRows({
        ...baseParams,
        viewMode: 'by-member',
        items: [members[0]], // Alice (id=1) has assignments 100 (project 10) and 102 (project 20)
        expandedItems: new Set([1]),
      })
      expect(rows).toHaveLength(3) // 1 parent + 2 children
      expect(rows[0].type).toBe('parent')
      expect(rows[1].type).toBe('child')
      expect(rows[2].type).toBe('child')
    })

    it('mix of expanded and collapsed items', () => {
      const rows = buildFlatRows({
        ...baseParams,
        viewMode: 'by-project',
        items: projects, // Alpha (2 assignments), Beta (1), Gamma (1)
        expandedItems: new Set([10]), // only Alpha expanded
      })
      // Alpha: 1 parent + 2 children = 3
      // Beta: 1 parent (collapsed) = 1
      // Gamma: 1 parent (collapsed) = 1
      expect(rows).toHaveLength(5)
      expect(rows[0]).toMatchObject({ type: 'parent', key: 'parent-10' })
      expect(rows[1]).toMatchObject({ type: 'child', key: 'child-100' })
      expect(rows[2]).toMatchObject({ type: 'child', key: 'child-101' })
      expect(rows[3]).toMatchObject({ type: 'parent', key: 'parent-20' })
      expect(rows[4]).toMatchObject({ type: 'parent', key: 'parent-30' })
    })
  })

  describe('keys', () => {
    it('parent keys are unique and prefixed', () => {
      const rows = buildFlatRows({
        ...baseParams,
        viewMode: 'by-project',
        items: projects,
        expandedItems: new Set<number>(),
      })
      const keys = rows.map(r => r.key)
      expect(new Set(keys).size).toBe(keys.length) // all unique
      expect(keys).toEqual(['parent-10', 'parent-20', 'parent-30'])
    })

    it('child keys are unique and prefixed', () => {
      const rows = buildFlatRows({
        ...baseParams,
        viewMode: 'by-project',
        items: [projects[0]],
        expandedItems: new Set([10]),
      })
      const childKeys = rows.filter(r => r.type === 'child').map(r => r.key)
      expect(childKeys).toEqual(['child-100', 'child-101'])
    })
  })

  describe('hideEmptyRows', () => {
    it('hides parent when all children have no day assignments in range', () => {
      const rows = buildFlatRows({
        ...baseParams,
        viewMode: 'by-project',
        items: [projects[1]], // Beta (id=20), assignment 102 has NO day assignments
        expandedItems: new Set([20]),
        hideEmptyRows: true,
      })
      expect(rows).toHaveLength(0) // parent hidden because child filtered out
    })

    it('keeps parent with at least one child having day assignments', () => {
      const rows = buildFlatRows({
        ...baseParams,
        viewMode: 'by-project',
        items: [projects[0]], // Alpha (id=10), assignments 100 and 101 both have day assignments
        expandedItems: new Set([10]),
        hideEmptyRows: true,
      })
      expect(rows).toHaveLength(3) // parent + 2 children
    })

    it('filters individual children with no day assignments', () => {
      // Give Alpha a third assignment with no day assignments
      const extraAssignment: ProjectAssignment = { id: 199, projectId: 10, teamMemberId: 2, createdAt: '' }
      const rows = buildFlatRows({
        ...baseParams,
        projectAssignments: [...assignments, extraAssignment],
        viewMode: 'by-project',
        items: [projects[0]],
        expandedItems: new Set([10]),
        hideEmptyRows: true,
      })
      // assignment 199 has no day assignments → filtered; 100 and 101 remain
      expect(rows).toHaveLength(3)
      expect(rows.filter(r => r.type === 'child')).toHaveLength(2)
    })
  })

  describe('showTentative (by-member view)', () => {
    it('includes tentative project children when showTentative=true', () => {
      const rows = buildFlatRows({
        ...baseParams,
        viewMode: 'by-member',
        items: [members[0]], // Alice: assignments to Alpha (confirmed) and Beta (tentative)
        expandedItems: new Set([1]),
        showTentative: true,
      })
      expect(rows.filter(r => r.type === 'child')).toHaveLength(2)
    })

    it('hides tentative project children when showTentative=false', () => {
      const rows = buildFlatRows({
        ...baseParams,
        viewMode: 'by-member',
        items: [members[0]], // Alice: assignments to Alpha (confirmed) and Beta (tentative)
        expandedItems: new Set([1]),
        showTentative: false,
      })
      const children = rows.filter(r => r.type === 'child')
      expect(children).toHaveLength(1) // only Alpha child
      if (children[0].type === 'child') {
        expect((children[0].childItem as Project).name).toBe('Alpha')
      }
    })

    it('does NOT filter tentative in by-project view', () => {
      const rows = buildFlatRows({
        ...baseParams,
        viewMode: 'by-project',
        items: [projects[1]], // Beta (tentative), assignment 102
        expandedItems: new Set([20]),
        showTentative: false, // should be ignored for by-project
      })
      // Parent is shown, child is shown (tentative filter only applies to by-member children)
      expect(rows).toHaveLength(2) // parent + 1 child
    })
  })

  describe('orphan assignments', () => {
    it('skips child when member not found (by-project)', () => {
      const rows = buildFlatRows({
        ...baseParams,
        memberById: new Map(), // empty — no members found
        viewMode: 'by-project',
        items: [projects[0]],
        expandedItems: new Set([10]),
      })
      expect(rows).toHaveLength(1) // only parent, no children
      expect(rows[0].type).toBe('parent')
    })

    it('skips child when project not found (by-member)', () => {
      const rows = buildFlatRows({
        ...baseParams,
        projectById: new Map(), // empty — no projects found
        viewMode: 'by-member',
        items: [members[0]],
        expandedItems: new Set([1]),
      })
      expect(rows).toHaveLength(1) // only parent, no children
    })
  })

  describe('child row data', () => {
    it('child rows carry the correct parentItem, childItem, and assignment', () => {
      const rows = buildFlatRows({
        ...baseParams,
        viewMode: 'by-project',
        items: [projects[0]],
        expandedItems: new Set([10]),
      })
      const child = rows[1]
      expect(child.type).toBe('child')
      if (child.type === 'child') {
        expect(child.parentItem).toBe(projects[0])
        expect(child.childItem).toBe(members[0]) // assignment 100 → member 1
        expect(child.assignment).toBe(assignments[0])
      }
    })
  })
})
