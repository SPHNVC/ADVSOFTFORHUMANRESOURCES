import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client/react'
import {
  PROJECTS_QUERY,
  DELETE_PROJECT_MUTATION,
  TOGGLE_PROJECT_SKILL_MUTATION,
  PROJECT_COMMENTS_QUERY,
  ADD_PROJECT_COMMENT_MUTATION,
  UPDATE_PROJECT_MUTATION,
  SET_PROJECT_REQUIREMENT_MUTATION,
  REMOVE_PROJECT_REQUIREMENT_MUTATION,
} from '../projects.gql.js'
import { SKILLS_QUERY } from '../../skills/skills.gql.js'
import AddProject from '../AddProject/AddProject.jsx'
import { PROJECT_STATUS_OPTIONS, PROJECT_STATUS_LABELS as STATUS_LABELS } from '../projectStatus.js'
import useSortableList from '../../../shared/useSortableList.js'
import SortableHeader from '../../../shared/SortableHeader.jsx'
import './Projects.css'

export default function Projects() {
  const navigate = useNavigate()

  const { data, loading, error } = useQuery(PROJECTS_QUERY)
  const { data: skillsData } = useQuery(SKILLS_QUERY)

  const [deleteProject] = useMutation(DELETE_PROJECT_MUTATION, {
    refetchQueries: [{ query: PROJECTS_QUERY }],
  })
  const [toggleProjectSkill] = useMutation(TOGGLE_PROJECT_SKILL_MUTATION)
  const [addProjectComment] = useMutation(ADD_PROJECT_COMMENT_MUTATION)
  const [updateProject] = useMutation(UPDATE_PROJECT_MUTATION, {
    refetchQueries: [{ query: PROJECTS_QUERY }],
  })
  const [setProjectRequirement] = useMutation(SET_PROJECT_REQUIREMENT_MUTATION, {
    refetchQueries: [{ query: PROJECTS_QUERY }],
  })
  const [removeProjectRequirement] = useMutation(REMOVE_PROJECT_REQUIREMENT_MUTATION, {
    refetchQueries: [{ query: PROJECTS_QUERY }],
  })

  const [expandedId, setExpandedId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [commentDrafts, setCommentDrafts] = useState({})

  const projects = data?.projects ?? []
  const skills = skillsData?.skills ?? []
  const { sorted: sortedProjects, sortKey, sortDirection, toggleSort } = useSortableList(projects, 'modifiedAt')

  function toggleRow(id) {
    setExpandedId(prev => (prev === id ? null : id))
  }

  async function handleDeleteProject(e, id) {
    e.stopPropagation()
    await deleteProject({ variables: { id } })
    if (expandedId === id) setExpandedId(null)
  }

  async function handleToggleSkill(projectId, skillId) {
    await toggleProjectSkill({
      variables: { projectId, skillId },
      refetchQueries: [{ query: PROJECTS_QUERY }],
    })
  }

  async function handleStatusChange(project, status) {
    await updateProject({
      variables: {
        id: project.id,
        input: {
          name: project.name,
          contactPerson: project.contactPerson,
          phone: project.phone,
          email: project.email,
          status,
        },
      },
    })
  }

  async function handleSetRequirement(projectId, skillId, neededCount) {
    await setProjectRequirement({
      variables: { input: { projectId, skillId, neededCount } },
    })
  }

  async function handleRemoveRequirement(projectId, skillId) {
    await removeProjectRequirement({ variables: { projectId, skillId } })
  }

  async function saveComment(projectId) {
    const text = (commentDrafts[projectId] || '').trim()
    if (!text) return
    await addProjectComment({
      variables: { input: { entityId: projectId, text } },
      refetchQueries: [{ query: PROJECT_COMMENTS_QUERY, variables: { projectId } }],
    })
    setCommentDrafts(prev => ({ ...prev, [projectId]: '' }))
  }

  function handleCommentKeyDown(e, projectId) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveComment(projectId)
    }
  }

  return (
    <div className="projects-page">
      <div className="projects-header">
        <h2 className="projects-title">Projects</h2>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>
          + Add new project
        </button>
      </div>

      {loading && <p className="loading-state">Loading projects…</p>}
      {error && <p className="error-state">Failed to load projects: {error.message}</p>}

      {!loading && !error && (
        <div className="table-wrapper">
          <table className="projects-table">
            <thead>
              <tr>
                <th className="col-expand" />
                <th><SortableHeader label="Project name" sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th><SortableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th>Staffing</th>
                <th><SortableHeader label="Contact person" sortKey="contactPerson" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th><SortableHeader label="Phone" sortKey="phone" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th><SortableHeader label="Email" sortKey="email" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th><SortableHeader label="Modified by" sortKey="modifiedBy" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th><SortableHeader label="Modified at" sortKey="modifiedAt" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th><SortableHeader label="Created by" sortKey="createdBy" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th><SortableHeader label="Created at" sortKey="createdAt" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sortedProjects.map(project => (
                <React.Fragment key={project.id}>
                  <tr
                    className={`project-row${expandedId === project.id ? ' is-expanded' : ''}`}
                    onClick={() => toggleRow(project.id)}
                  >
                    <td className="col-expand">
                      <span className={`chevron${expandedId === project.id ? ' open' : ''}`}>›</span>
                    </td>
                    <td className="cell-primary">{project.name}</td>
                    <td>
                      <span className={`project-status status-${project.status.toLowerCase()}`}>
                        {STATUS_LABELS[project.status] ?? project.status}
                      </span>
                    </td>
                    <td><StaffingCell requirements={project.requirements ?? []} /></td>
                    <td>{project.contactPerson}</td>
                    <td>{project.phone ?? '—'}</td>
                    <td>{project.email ?? '—'}</td>
                    <td>{project.modifiedBy}</td>
                    <td>{project.modifiedAt}</td>
                    <td>{project.createdBy}</td>
                    <td>{project.createdAt}</td>
                    <td className="col-actions" onClick={e => e.stopPropagation()}>
                      <button
                        className="btn-assignments"
                        onClick={() => navigate(`/projects/${project.id}/assignments`)}
                      >
                        Assignments
                      </button>
                      <button
                        className="btn-danger"
                        onClick={e => handleDeleteProject(e, project.id)}
                        aria-label="Delete project"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>

                  {expandedId === project.id && (
                    <tr key={`${project.id}-detail`} className="comments-row">
                      <td colSpan={12}>
                        <ExpandedPanel
                          project={project}
                          skills={skills}
                          onStatusChange={status => handleStatusChange(project, status)}
                          onSetRequirement={handleSetRequirement}
                          onRemoveRequirement={handleRemoveRequirement}
                          commentDraft={commentDrafts[project.id] || ''}
                          onDraftChange={val =>
                            setCommentDrafts(prev => ({ ...prev, [project.id]: val }))
                          }
                          onToggleSkill={handleToggleSkill}
                          onSaveComment={() => saveComment(project.id)}
                          onCommentKeyDown={e => handleCommentKeyDown(e, project.id)}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && <AddProject onClose={() => setModalOpen(false)} />}
    </div>
  )
}

// Compact needed-vs-filled summary for the collapsed row.
function StaffingCell({ requirements }) {
  if (requirements.length === 0) return <span className="staffing-none">—</span>

  const needed = requirements.reduce((sum, r) => sum + r.needed, 0)
  const filled = requirements.reduce((sum, r) => sum + Math.min(r.filled, r.needed), 0)

  return (
    <span className={`staffing-count${filled >= needed ? ' is-met' : ''}`}>
      {filled}/{needed}
    </span>
  )
}

function ExpandedPanel({
  project,
  skills,
  commentDraft,
  onDraftChange,
  onToggleSkill,
  onSaveComment,
  onCommentKeyDown,
  onStatusChange,
  onSetRequirement,
  onRemoveRequirement,
}) {
  const { data, loading } = useQuery(PROJECT_COMMENTS_QUERY, {
    variables: { projectId: project.id },
  })

  const comments = data?.projectComments ?? []

  return (
    <div className="comments-panel">
      <div className="project-status-section">
        <label className="project-status-label">
          Status
          <select
            value={project.status}
            onChange={e => onStatusChange(e.target.value)}
          >
            {PROJECT_STATUS_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      <RequirementsEditor
        project={project}
        skills={skills}
        onSetRequirement={onSetRequirement}
        onRemoveRequirement={onRemoveRequirement}
      />

      {skills.length > 0 && (
        <div className="skills-section">
          <p className="comments-heading">Skills</p>
          <div className="skills-chips">
            {skills.map(skill => {
              const checked = (project.skillIds ?? []).includes(skill.id)
              return (
                <label key={skill.id} className={`skill-chip${checked ? ' selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleSkill(project.id, skill.id)}
                  />
                  {skill.name}
                </label>
              )
            })}
          </div>
        </div>
      )}

      <p className="comments-heading">Comments</p>

      {loading && <p className="no-comments">Loading…</p>}

      {!loading && comments.length === 0 && (
        <p className="no-comments">No comments yet.</p>
      )}

      {!loading && comments.length > 0 && (
        <ul className="comments-list">
          {comments.map(c => (
            <li key={c.id} className="comment-item">
              <span className="comment-author">{c.author}</span>
              <span className="comment-at">{c.at}</span>
              <p className="comment-text">{c.text}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="comment-compose">
        <textarea
          className="comment-input"
          rows={2}
          placeholder="Write a comment… (Enter to save)"
          value={commentDraft}
          onChange={e => onDraftChange(e.target.value)}
          onKeyDown={onCommentKeyDown}
        />
        <button className="btn-save-comment" onClick={onSaveComment}>
          Save
        </button>
      </div>
    </div>
  )
}

// How many resources this project needs per skill. `filled` comes from
// assignments tagged with that skill, so it is read-only here.
function RequirementsEditor({ project, skills, onSetRequirement, onRemoveRequirement }) {
  const [skillId, setSkillId] = useState('')
  const [count, setCount] = useState('1')

  const requirements = project.requirements ?? []
  const usedSkillIds = requirements.map(r => r.skillId)
  const available = skills.filter(s => !usedSkillIds.includes(s.id))

  async function handleAdd() {
    const parsed = Number(count)
    if (!skillId || !Number.isInteger(parsed) || parsed < 1) return
    await onSetRequirement(project.id, skillId, parsed)
    setSkillId('')
    setCount('1')
  }

  return (
    <div className="requirements-section">
      <p className="comments-heading">Needed resources</p>

      {requirements.length === 0 && (
        <p className="no-comments">No resource requirements set for this project yet.</p>
      )}

      {requirements.length > 0 && (
        <ul className="requirements-list">
          {requirements.map(r => (
            <li key={r.skillId} className="requirement-item">
              <span className="requirement-skill">{r.skillName}</span>
              <input
                type="number"
                min="1"
                className="requirement-count"
                value={r.needed}
                onChange={e => {
                  const parsed = Number(e.target.value)
                  if (Number.isInteger(parsed) && parsed >= 1) {
                    onSetRequirement(project.id, r.skillId, parsed)
                  }
                }}
                aria-label={`Resources needed for ${r.skillName}`}
              />
              <span className={`requirement-filled${r.filled >= r.needed ? ' is-met' : ''}`}>
                {r.filled} assigned
              </span>
              <button
                className="btn-remove"
                onClick={() => onRemoveRequirement(project.id, r.skillId)}
                aria-label={`Remove ${r.skillName} requirement`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {available.length > 0 && (
        <div className="requirement-add">
          <select value={skillId} onChange={e => setSkillId(e.target.value)}>
            <option value="">Select a skill…</option>
            {available.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            value={count}
            onChange={e => setCount(e.target.value)}
            aria-label="Number of resources needed"
          />
          <button className="btn-secondary" onClick={handleAdd} disabled={!skillId}>
            Add requirement
          </button>
        </div>
      )}
    </div>
  )
}
