import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { SKILLS_QUERY, DELETE_SKILL_MUTATION } from '../skills.gql.js'
import AddSkill from '../AddSkill/AddSkill.jsx'
import './Skills.css'

export default function Skills() {
  const { data, loading, error } = useQuery(SKILLS_QUERY)
  const [deleteSkill] = useMutation(DELETE_SKILL_MUTATION, {
    refetchQueries: [{ query: SKILLS_QUERY }],
  })

  const [modalOpen, setModalOpen] = useState(false)
  const skills = data?.skills ?? []

  return (
    <div className="skills-page">
      <div className="skills-header">
        <h2 className="skills-title">Skills</h2>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>
          + Add new skill
        </button>
      </div>

      {loading && <p className="skills-empty">Loading skills…</p>}
      {error && <p className="skills-empty" style={{ color: '#c0392b' }}>Failed to load skills: {error.message}</p>}

      {!loading && !error && skills.length === 0 && (
        <p className="skills-empty">No skills defined yet.</p>
      )}

      {skills.length > 0 && (
        <ul className="skills-list">
          {skills.map(skill => (
            <li key={skill.id} className="skill-item">
              <div className="skill-info">
                <span className="skill-name">{skill.name}</span>
                {skill.description && (
                  <span className="skill-desc">{skill.description}</span>
                )}
              </div>
              <button
                className="btn-remove"
                onClick={() => deleteSkill({ variables: { id: skill.id } })}
                aria-label={`Remove ${skill.name}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {modalOpen && <AddSkill onClose={() => setModalOpen(false)} />}
    </div>
  )
}
