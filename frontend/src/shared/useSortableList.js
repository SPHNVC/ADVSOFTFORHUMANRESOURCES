import { useMemo, useState } from 'react'

function compareValues(a, b) {
  if (typeof a === 'boolean' || typeof b === 'boolean') {
    if (a === b) return 0
    return a ? 1 : -1
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }
  // Dates in this app are pre-formatted sortable strings ("YYYY-MM-DD HH:MM"),
  // so a plain string compare already sorts them chronologically.
  return String(a ?? '').localeCompare(String(b ?? ''))
}

/**
 * Client-side sort for a table's rows. Clicking the same key again flips
 * direction; clicking a different key switches to it and resets to
 * descending (newest/highest first is the more common "just tell me what
 * changed" default for this app's data).
 */
export default function useSortableList(items, defaultKey, defaultDirection = 'desc') {
  const [sortKey, setSortKey] = useState(defaultKey)
  const [sortDirection, setSortDirection] = useState(defaultDirection)

  function toggleSort(key) {
    if (key === sortKey) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('desc')
    }
  }

  const sorted = useMemo(() => {
    const copy = [...items]
    copy.sort((a, b) => {
      const cmp = compareValues(a[sortKey], b[sortKey])
      return sortDirection === 'asc' ? cmp : -cmp
    })
    return copy
  }, [items, sortKey, sortDirection])

  return { sorted, sortKey, sortDirection, toggleSort }
}
