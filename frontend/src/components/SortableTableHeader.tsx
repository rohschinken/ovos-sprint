import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TableHead } from '@/components/ui/table'
import { SortOrder } from '@/hooks/use-sort'

interface SortableTableHeaderProps<T> {
  label: string
  sortKey: T
  currentSortKey: T
  currentSortOrder: SortOrder
  onSort: (key: T) => void
  className?: string
}

export function SortableTableHeader<T>({
  label,
  sortKey,
  currentSortKey,
  currentSortOrder,
  onSort,
  className,
}: SortableTableHeaderProps<T>) {
  const isSorted = sortKey === currentSortKey

  return (
    <TableHead className={className}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8"
        onClick={() => onSort(sortKey)}
      >
        {label}
        {isSorted ? (
          currentSortOrder === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : (
            <ArrowDown className="ml-2 h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
        )}
      </Button>
    </TableHead>
  )
}
