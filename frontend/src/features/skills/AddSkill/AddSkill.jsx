import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { CREATE_SKILL_MUTATION, SKILLS_QUERY } from '../skills.gql.js'
import './AddSkill.css'

const EMPTY_FORM = { name: '', description: '' }

export default function AddSkill({ onClose }) {
  const [form, setForm] = useState(EMPTY_FORM)

  const [createSkill] = useMutation(CREATE_SKILL_MUTATION, {
    refetchQueries: [{ query: SKILLS_QUERY }],
  })

  function handleFormChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    await createSkill({
      variables: {
        input: {
          name: form.name.trim(),
          description: form.description.trim() || null,
        },
      },
    })
    onClose()
  }

  const formValid = form.name.trim()

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add new skill</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label>
            Skill name <span className="required">*</span>
            <input
              name="name"
              value={form.name}
              onChange={handleFormChange}
              placeholder="e.g. TypeScript"
              required
              autoFocus
            />
          </label>

          <label>
            Description
            <input
              name="description"
              value={form.description}
              onChange={handleFormChange}
              placeholder="e.g. Typed superset of JavaScript"
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!formValid}>
              Add skill
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
