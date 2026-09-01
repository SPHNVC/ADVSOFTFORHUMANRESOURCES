import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { SKILLS_QUERY } from '../../skills/skills.gql.js'
import { RESOURCE_ALLOCATIONS_QUERY } from '../availability.gql.js'
import AssignResourceModal from '../AssignResourceModal/AssignResourceModal.jsx'
import './Availability.css'

const POLL_INTERVAL_MS = 15000

const STATUS_CLASSES = {
  FREE: 'badge-free',
  ASSIGNED_TO_PROJECT: 'badge-assigned',
  BLACKLIST: 'badge-blacklist',
}

const STATUS_LABELS = {
  FREE: 'Free',
  ASSIGNED_TO_PROJECT: 'Assigned to project',
  BLACKLIST: 'Blacklist',
}

const AVAILABILITY_LABELS = {
  ASAP: 'ASAP',
  ONE_WEEK: '1 week',
  TWO_WEEKS: '2 weeks',
  THREE_WEEKS: '3 weeks',
}

export default function Availability() {
  const [search, setSearch] = useState('')
  const [availability, setAvailability] = useState('')
  const [skillId, setSkillId] = useState('')
  const [onlyFree, setOnlyFree] = useState(false)
  const [assigningResource, setAssigningResource] = useState(null)

  const { data, loading, error } = useQuery(RESOURCE_ALLOCATIONS_QUERY, {
    pollInterval: POLL_INTERVAL_MS,
  })
  const { data: skillsData } = useQuery(SKILLS_QUERY)

  const allocations = data?.resourceAllocations ?? []
  const skills = skillsData?.skills ?? []

  const visible = allocations.filter(a => {
    const r = a.resource
    if (onlyFree && a.projectCount > 0) return false
    if (availability && r.availability !== availability) return false
    if (skillId && !(r.skillIds ?? []).includes(skillId)) return false
    if (search.trim() && !r.name.toLowerCase().includes(search.trim().toLowerCase())) return false
    return true
  })

  return (
    <div className="availability-page">
      <div className="availability-header">
        <h2 className="availability-title">Resource availability</h2>
        <p className="availability-subtitle">
          Who is free, who is loaded, and how soon they can start.
        </p>
      </div>

      <div className="availability-filters">
        <label className="availability-filter">
          Search
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Name…"
          />
        </label>
        <label className="availability-filter">
          Availability
          <select value={availability} onChange={e => setAvailability(e.target.value)}>
            <option value="">Any</option>
            {Object.entries(AVAILABILITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="availability-filter">
          Skill
          <select value={skillId} onChange={e => setSkillId(e.target.value)}>
            <option value="">Any</option>
            {skills.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="availability-checkbox">
          <input
            type="checkbox"
            checked={onlyFree}
            onChange={e => setOnlyFree(e.target.checked)}
          />
          Unassigned only
        </label>
      </div>

      {loading && allocations.length === 0 && <p className="loading-state">Loading resources…</p>}
      {error && <p className="error-state">Failed to load resources: {error.message}</p>}

      {allocations.length > 0 && (
        <>
          <p className="availability-count">
            Showing {visible.length} of {allocations.length} resources
          </p>
          <div className="table-wrapper">
            <table className="availability-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Available</th>
                  <th>Projects</th>
                  <th>Assigned to</th>
                  <th>Contact</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map(a => (
                  <tr key={a.resource.id}>
                    <td className="cell-primary">{a.resource.name}</td>
                    <td>
                      <span className={`status-badge ${STATUS_CLASSES[a.resource.status] ?? ''}`}>
                        {STATUS_LABELS[a.resource.status] ?? a.resource.status}
                      </span>
                    </td>
                    <td>
                      {a.resource.availability
                        ? AVAILABILITY_LABELS[a.resource.availability] ?? a.resource.availability
                        : '—'}
                    </td>
                    <td>{a.projectCount}</td>
                    <td>
                      {a.projectNames.length === 0 ? (
                        <span className="availability-muted">—</span>
                      ) : (
                        <div className="availability-projects">
                          {a.projectNames.map(name => (
                            <span key={name} className="availability-project-tag">{name}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>{a.resource.email ?? a.resource.phone ?? '—'}</td>
                    <td className="col-actions">
                      {a.resource.status !== 'BLACKLIST' && (
                        <button
                          className="btn-assign"
                          onClick={() => setAssigningResource(a.resource)}
                        >
                          Assign
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visible.length === 0 && (
            <p className="availability-empty">No resources match these filters.</p>
          )}
        </>
      )}

      {assigningResource && (
        <AssignResourceModal
          resource={assigningResource}
          onClose={() => setAssigningResource(null)}
        />
      )}
    </div>
  )
}
