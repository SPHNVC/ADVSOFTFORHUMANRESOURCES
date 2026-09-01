import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { RESOURCE_ALLOCATIONS_QUERY, MATCH_PROJECTS_QUERY } from '../availability.gql.js'
import { ASSIGN_RESOURCE_MUTATION } from '../../assignments/assignments.gql.js'
import { PROJECTS_QUERY } from '../../projects/projects.gql.js'
import { RESOURCES_QUERY } from '../../resources/resources.gql.js'
import { PROJECT_STATUS_LABELS } from '../../projects/projectStatus.js'
import './AssignResourceModal.css'

export default function AssignResourceModal({ resource, onClose }) {
  // Which requirement slot each candidate project will be assigned against.
  const [slotChoices, setSlotChoices] = useState({})

  const { data, loading, error } = useQuery(MATCH_PROJECTS_QUERY, {
    variables: { resourceId: resource.id },
  })

  const [assignResource] = useMutation(ASSIGN_RESOURCE_MUTATION, {
    refetchQueries: [
      { query: RESOURCE_ALLOCATIONS_QUERY },
      { query: MATCH_PROJECTS_QUERY, variables: { resourceId: resource.id } },
      { query: PROJECTS_QUERY },
      { query: RESOURCES_QUERY },
    ],
  })

  const matches = data?.matchProjects ?? []

  function slotFor(match) {
    if (slotChoices[match.project.id] !== undefined) return slotChoices[match.project.id]
    const open = (match.project.requirements ?? []).find(
      r => r.filled < r.needed && match.matchingSkillIds.includes(r.skillId),
    )
    return open?.skillId ?? ''
  }

  async function handleAssign(match) {
    const skillId = slotFor(match)
    await assignResource({
      variables: { projectId: match.project.id, resourceId: resource.id, skillId: skillId || null },
    })
    setSlotChoices(prev => {
      const next = { ...prev }
      delete next[match.project.id]
      return next
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal assign-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Assign {resource.name}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {loading && <p className="loading-state">Finding open projects…</p>}
        {error && <p className="error-state">Failed to load matching projects: {error.message}</p>}

        {!loading && !error && matches.length === 0 && (
          <p className="empty-hint">No open projects match right now.</p>
        )}

        {matches.length > 0 && (
          <div className="table-wrapper">
            <table className="assign-modal-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Match</th>
                  <th>Open positions</th>
                  <th>Assign as</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {matches.map(m => (
                  <tr key={m.project.id}>
                    <td className="cell-primary">{m.project.name}</td>
                    <td>{PROJECT_STATUS_LABELS[m.project.status] ?? m.project.status}</td>
                    <td>
                      <span className={`match-score${m.matchScore > 0 ? ' has-match' : ''}`}>
                        {m.matchScore}
                      </span>
                    </td>
                    <td>{m.openPositions}</td>
                    <td>
                      <select
                        value={slotFor(m)}
                        onChange={e =>
                          setSlotChoices(prev => ({ ...prev, [m.project.id]: e.target.value }))
                        }
                      >
                        <option value="">General</option>
                        {(m.project.requirements ?? []).map(r => (
                          <option key={r.skillId} value={r.skillId}>
                            {r.skillName} ({r.filled}/{r.needed})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button className="btn-assign" onClick={() => handleAssign(m)}>
                        Assign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
