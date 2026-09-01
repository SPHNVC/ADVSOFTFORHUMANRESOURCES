import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { CREATE_PROJECT_MUTATION, PROJECTS_QUERY } from '../projects.gql.js'
import { PROJECT_STATUS_OPTIONS } from '../projectStatus.js'
import './AddProject.css'

const EMPTY_FORM = { name: '', contactPerson: '', phone: '', email: '', status: 'PLANNING' }

export default function AddProject({ onClose }) {
  const [form, setForm] = useState(EMPTY_FORM)

  const [createProject] = useMutation(CREATE_PROJECT_MUTATION, {
    refetchQueries: [{ query: PROJECTS_QUERY }],
  })

  function handleFormChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    await createProject({
      variables: {
        input: {
          name: form.name,
          contactPerson: form.contactPerson,
          phone: form.phone || null,
          email: form.email || null,
          status: form.status,
        },
      },
    })
    onClose()
  }

  const formValid = form.name.trim() && form.contactPerson.trim()

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add new project</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label>
            Project name <span className="required">*</span>
            <input
              name="name"
              value={form.name}
              onChange={handleFormChange}
              placeholder="e.g. Gamma Launch"
              required
              autoFocus
            />
          </label>

          <label>
            Contact person <span className="required">*</span>
            <input
              name="contactPerson"
              value={form.contactPerson}
              onChange={handleFormChange}
              placeholder="e.g. Sarah Mills"
              required
            />
          </label>

          <label>
            Phone
            <input
              name="phone"
              value={form.phone}
              onChange={handleFormChange}
              placeholder="e.g. +1 555-0303"
            />
          </label>

          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleFormChange}
              placeholder="e.g. contact@company.com"
            />
          </label>

          <label>
            Status
            <select name="status" value={form.status} onChange={handleFormChange}>
              {PROJECT_STATUS_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <p className="modal-hint">
            Set how many resources this project needs per skill from the project
            row once it is created.
          </p>

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!formValid}>
              Add project
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
