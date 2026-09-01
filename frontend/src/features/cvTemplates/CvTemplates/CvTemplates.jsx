import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import {
  CV_TEMPLATES_QUERY,
  DELETE_CV_TEMPLATE_MUTATION,
} from '../../resources/cv.gql.js'
import CvTemplateEditor from '../CvTemplateEditor/CvTemplateEditor.jsx'
import './CvTemplates.css'

export default function CvTemplates() {
  const { data, loading, error } = useQuery(CV_TEMPLATES_QUERY)
  const [deleteTemplate] = useMutation(DELETE_CV_TEMPLATE_MUTATION, {
    refetchQueries: [{ query: CV_TEMPLATES_QUERY }],
  })

  // null = closed, {} = creating, {id,...} = editing
  const [editing, setEditing] = useState(null)

  const templates = data?.cvTemplates ?? []

  async function handleDelete(template) {
    const ok = window.confirm(
      `Delete the template “${template.name}”? This cannot be undone.`,
    )
    if (ok) await deleteTemplate({ variables: { id: template.id } })
  }

  return (
    <div className="cv-templates-page">
      <div className="cv-templates-header">
        <h2 className="cv-templates-title">CV templates</h2>
        <button className="btn-primary" onClick={() => setEditing({})}>
          + Add new template
        </button>
      </div>

      <p className="cv-templates-intro">
        Templates control the layout of generated CVs. They use resource details,
        skills and activities — comments, status and project assignments are never
        included.
      </p>

      {loading && <p className="cv-templates-empty">Loading templates…</p>}
      {error && (
        <p className="cv-templates-empty cv-templates-empty--error">
          Failed to load templates: {error.message}
        </p>
      )}

      {!loading && !error && templates.length === 0 && (
        <p className="cv-templates-empty">No templates defined yet.</p>
      )}

      {templates.length > 0 && (
        <ul className="cv-templates-list">
          {templates.map(template => (
            <li key={template.id} className="cv-template-item">
              <div className="cv-template-info">
                <span className="cv-template-name">
                  {template.name}
                  {template.isDefault && (
                    <span className="cv-template-badge">Default</span>
                  )}
                </span>
                {template.description && (
                  <span className="cv-template-desc">{template.description}</span>
                )}
                <span className="cv-template-meta">
                  Updated {template.modifiedAt}
                </span>
              </div>
              <div className="cv-template-actions">
                <button className="btn-secondary" onClick={() => setEditing(template)}>
                  Edit
                </button>
                <button className="btn-remove" onClick={() => handleDelete(template)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <CvTemplateEditor template={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
