import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client/react'
import { PROJECTS_QUERY } from '../projects/projects.gql.js'
import { SKILLS_QUERY } from '../skills/skills.gql.js'
import { RESOURCES_QUERY } from '../resources/resources.gql.js'
import {
  PROJECT_ASSIGNMENTS_QUERY,
  MATCH_RESOURCES_QUERY,
  ASSIGN_RESOURCE_MUTATION,
  UNASSIGN_RESOURCE_MUTATION,
} from './assignments.gql.js'
import './Assignments.css'

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

export default function Assignments() {
  const { projectId } = useParams()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [availability, setAvailability] = useState('')
  const [skillFilter, setSkillFilter] = useState('')
  const [onlyFree, setOnlyFree] = useState(false)
  // Which requirement slot each candidate will be assigned against.
  const [slotChoices, setSlotChoices] = useState({})

  const { data: projectsData } = useQuery(PROJECTS_QUERY)
  const { data: skillsData } = useQuery(SKILLS_QUERY)
  const { data: assignmentsData, loading: assignmentsLoading } = useQuery(PROJECT_ASSIGNMENTS_QUERY, {
    variables: { projectId },
  })

  const filter = {
    search: search.trim() || null,
    availability: availability ? [availability] : null,
    skillIds: skillFilter ? [skillFilter] : null,
    onlyFree,
  }
  const { data: matchData, loading: matchLoading } = useQuery(MATCH_RESOURCES_QUERY, {
    variables: { projectId, filter },
  })

  const refetchAfterChange = [
    { query: PROJECT_ASSIGNMENTS_QUERY, variables: { projectId } },
    { query: MATCH_RESOURCES_QUERY, variables: { projectId, filter } },
    { query: PROJECTS_QUERY },
    { query: RESOURCES_QUERY },
  ]

  const [assignResource] = useMutation(ASSIGN_RESOURCE_MUTATION, {
    refetchQueries: refetchAfterChange,
  })
  const [unassignResource] = useMutation(UNASSIGN_RESOURCE_MUTATION, {
    refetchQueries: refetchAfterChange,
  })

  const project = (projectsData?.projects ?? []).find(p => p.id === projectId)
  const skills = skillsData?.skills ?? []
  const assigned = assignmentsData?.projectAssignments ?? []
  const matches = matchData?.matchResources ?? []
  const requirements = project?.requirements ?? []

  const skillName = id => skills.find(s => s.id === id)?.name

  // Default each candidate to the first requirement they can actually fill.
  function slotFor(match) {
    if (slotChoices[match.resource.id] !== undefined) return slotChoices[match.resource.id]
    const open = requirements.find(
      r => r.filled < r.needed && match.matchingSkillIds.includes(r.skillId),
    )
    return open?.skillId ?? ''
  }

  async function handleAssign(match) {
    const skillId = slotFor(match)
    await assignResource({
      variables: { projectId, resourceId: match.resource.id, skillId: skillId || null },
    })
    setSlotChoices(prev => {
      const next = { ...prev }
      delete next[match.resource.id]
      return next
    })
  }

  async function handleUnassign(resourceId) {
    await unassignResource({ variables: { projectId, resourceId } })
  }

  return (
    <div className="assignments-page">
      <div className="assignments-header">
        <button className="btn-back" onClick={() => navigate('/projects')}>
          Back to projects
        </button>
        <div className="assignments-title-group">
          <h2 className="assignments-title">
            Assignments
            {project && <span className="project-context"> — {project.name}</span>}
          </h2>
          {!project && <p className="project-not-found">Project #{projectId} not found.</p>}
        </div>
      </div>

      {requirements.length > 0 && (
        <div className="requirement-progress">
          {requirements.map(r => (
            <span
              key={r.skillId}
              className={`requirement-pill${r.filled >= r.needed ? ' is-met' : ''}`}
            >
              {r.skillName} <strong>{r.filled}/{r.needed}</strong>
            </span>
          ))}
        </div>
      )}
      {requirements.length === 0 && project && (
        <p className="requirement-hint">
          No per-skill requirements set — candidates are ranked against the project&apos;s
          tagged skills. Set requirements from the project row to track staffing gaps.
        </p>
      )}

      <div className="assignments-layout">
        {/* Assigned resources */}
        <section className="assignment-section">
          <h3 className="section-heading">Assigned resources ({assigned.length})</h3>
          {assignmentsLoading && <p className="empty-hint">Loading…</p>}
          {!assignmentsLoading && assigned.length === 0 && (
            <p className="empty-hint">No resources assigned yet. Pick from the list on the right.</p>
          )}
          {assigned.length > 0 && (
            <div className="table-wrapper">
              <table className="assignments-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Assigned as</th>
                    <th>Email</th>
                    <th>Assigned at</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {assigned.map(a => (
                    <tr key={a.id}>
                      <td className="cell-primary">{a.resourceName}</td>
                      <td>
                        {a.skillId ? (
                          <span className="skill-tag">{skillName(a.skillId) ?? '—'}</span>
                        ) : (
                          <span className="no-match">General</span>
                        )}
                      </td>
                      <td>{a.resourceEmail ?? a.resourcePhone ?? '—'}</td>
                      <td>{a.assignedAt}</td>
                      <td>
                        <button
                          className="btn-remove"
                          onClick={() => handleUnassign(a.resourceId)}
                          title="Remove assignment"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Candidates */}
        <section className="assignment-section">
          <h3 className="section-heading">Best matches ({matches.length})</h3>

          <div className="match-filters">
            <input
              className="match-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name…"
            />
            <select value={skillFilter} onChange={e => setSkillFilter(e.target.value)}>
              <option value="">Any skill</option>
              {skills.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select value={availability} onChange={e => setAvailability(e.target.value)}>
              <option value="">Any availability</option>
              {Object.entries(AVAILABILITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <label className="match-checkbox">
              <input
                type="checkbox"
                checked={onlyFree}
                onChange={e => setOnlyFree(e.target.checked)}
              />
              Unassigned only
            </label>
          </div>

          {matchLoading && matches.length === 0 && <p className="empty-hint">Finding matches…</p>}

          {!matchLoading && matches.length === 0 ? (
            <p className="empty-hint">No resources match these filters.</p>
          ) : (
            <div className="table-wrapper">
              <table className="assignments-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Match</th>
                    <th>Status</th>
                    <th>Available</th>
                    <th>Matching skills</th>
                    <th>Assign as</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {matches.map(m => (
                    <tr key={m.resource.id}>
                      <td className="cell-primary">
                        {m.resource.name}
                        {m.assignedProjectCount > 0 && (
                          <span className="on-projects">on {m.assignedProjectCount} project(s)</span>
                        )}
                      </td>
                      <td>
                        <span className={`match-score${m.matchScore > 0 ? ' has-match' : ''}`}>
                          {m.matchScore}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${STATUS_CLASSES[m.resource.status] ?? ''}`}>
                          {STATUS_LABELS[m.resource.status] ?? m.resource.status}
                        </span>
                      </td>
                      <td>
                        {m.resource.availability
                          ? AVAILABILITY_LABELS[m.resource.availability] ?? m.resource.availability
                          : '—'}
                      </td>
                      <td>
                        {m.matchingSkillIds.length > 0 ? (
                          <div className="matching-skills">
                            {m.matchingSkillIds.map(id => (
                              <span key={id} className="skill-tag">{skillName(id) ?? id}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="no-match">—</span>
                        )}
                      </td>
                      <td>
                        <select
                          value={slotFor(m)}
                          onChange={e =>
                            setSlotChoices(prev => ({ ...prev, [m.resource.id]: e.target.value }))
                          }
                        >
                          <option value="">General</option>
                          {requirements.map(r => (
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
        </section>
      </div>
    </div>
  )
}
