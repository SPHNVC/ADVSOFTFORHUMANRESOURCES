// A clickable <th> label for tables driven by useSortableList.js. Renders as
// a <button> so it's keyboard/focus accessible for free, rather than
// hand-rolling role/tabIndex/onKeyDown on a <th>.
export default function SortableHeader({ label, sortKey, activeKey, direction, onSort }) {
  const isActive = sortKey === activeKey
  return (
    <button type="button" className="sort-header" onClick={() => onSort(sortKey)}>
      {label}
      <span className={`sort-arrow${isActive ? ' is-active' : ''}`}>
        {isActive ? (direction === 'asc' ? '▲' : '▼') : '↕'}
      </span>
    </button>
  )
}
