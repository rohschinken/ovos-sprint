import { useState, useMemo } from 'react'

export type SortOrder = 'asc' | 'desc'

export function useSort<T, K extends keyof T>(
  data: T[],
  defaultSortKey: K,
  defaultSortOrder: SortOrder = 'asc'
) {
  const [sortKey, setSortKey] = useState<K>(defaultSortKey)
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder)

  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]

      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [data, sortKey, sortOrder])

  const toggleSort = (key: K) => {
    if (key === sortKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  return { sortedData, sortKey, sortOrder, toggleSort }
}
