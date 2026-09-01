// Mirrors the ProjectStatus GraphQL enum and the CHECK constraint in
// migration 000017. Kept out of the component files so fast refresh keeps
// working (a module may export components or constants, not both).
export const PROJECT_STATUS_OPTIONS = [
  { value: 'PLANNING', label: 'Planning' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_HOLD', label: 'On hold' },
  { value: 'COMPLETED', label: 'Completed' },
]

export const PROJECT_STATUS_LABELS = Object.fromEntries(
  PROJECT_STATUS_OPTIONS.map(({ value, label }) => [value, label]),
)
