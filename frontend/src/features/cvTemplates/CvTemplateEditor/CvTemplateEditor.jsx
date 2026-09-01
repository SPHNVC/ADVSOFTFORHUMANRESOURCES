import { useState, useMemo } from 'react'
import { useMutation } from '@apollo/client/react'
import {
  CV_TEMPLATES_QUERY,
  CREATE_CV_TEMPLATE_MUTATION,
  UPDATE_CV_TEMPLATE_MUTATION,
} from '../../resources/cv.gql.js'
import { STARTER_TEMPLATE, TEMPLATE_FIELDS, SAMPLE_DATA } from '../templateReference.js'
import { renderPreview } from '../previewRenderer.js'
import { CV_PREVIEW_CSS } from '../previewStyles.js'
import './CvTemplateEditor.css'

function toForm(template) {
  return {
    name: template.name ?? '',
    description: template.description ?? '',
    html: template.html ?? STARTER_TEMPLATE,
    isDefault: template.isDefault ?? false,
  }
}

export default function CvTemplateEditor({ template, onClose }) {
  const isEdit = Boolean(template.id)
  const [form, setForm] = useState(() => toForm(template))
  const [saveError, setSaveError] = useState(null)

  const preview = useMemo(
    () => renderPreview(form.html, SAMPLE_DATA),
    [form.html],
  )
  const previewDoc = useMemo(
    () =>
      preview.html == null
        ? ''
        : `<!doctype html><html><head><meta charset="utf-8"><style>${CV_PREVIEW_CSS}</style></head><body>${preview.html}</body></html>`,
    [preview.html],
  )

  const refetch = { refetchQueries: [{ query: CV_TEMPLATES_QUERY }] }
  const [createTemplate, { loading: creating }] = useMutation(
    CREATE_CV_TEMPLATE_MUTATION, refetch,
  )
  const [updateTemplate, { loading: updating }] = useMutation(
    UPDATE_CV_TEMPLATE_MUTATION, refetch,
  )
  const saving = creating || updating

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    setSaveError(null)
  }

  function insertField(field) {
    setForm(prev => ({ ...prev, html: `${prev.html}${field}` }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const input = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      html: form.html,
      isDefault: form.isDefault,
    }
    try {
      if (isEdit) {
        await updateTemplate({ variables: { id: template.id, input } })
      } else {
        await createTemplate({ variables: { input } })
      }
      onClose()
    } catch (err) {
      setSaveError(err.message ?? 'Failed to save the template.')
    }
  }

  const formValid = form.name.trim() && form.html.trim()

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cv-template-editor-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 id="cv-template-editor-title">
            {isEdit ? 'Edit template' : 'Add new template'}
          </h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form className="tpl-form" onSubmit={handleSubmit}>
          <div className="tpl-row">
            <label className="tpl-field tpl-field--grow">
              Template name <span className="required">*</span>
              <input name="name" value={form.name} onChange={handleChange} required />
            </label>
            <label className="tpl-checkbox">
              <input
                type="checkbox"
                name="isDefault"
                checked={form.isDefault}
                onChange={handleChange}
              />
              Use as default
            </label>
          </div>

          <label className="tpl-field">
            Description
            <input
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Short note about when to use this template"
            />
          </label>

          <div className="tpl-editor">
            <div className="tpl-editor-pane">
              <div className="tpl-pane-head">
                <span>Template HTML</span>
              </div>
              <textarea
                name="html"
                className="tpl-code"
                value={form.html}
                onChange={handleChange}
                spellCheck={false}
                required
              />
              <details className="tpl-fields">
                <summary>Available fields — click to insert</summary>
                <div className="tpl-field-groups">
                  {TEMPLATE_FIELDS.map(group => (
                    <div key={group.label} className="tpl-field-group">
                      <h4>{group.label}</h4>
                      <div className="tpl-chips">
                        {group.fields.map(f => (
                          <button
                            key={f.token}
                            type="button"
                            className="tpl-chip"
                            title={f.hint}
                            onClick={() => insertField(f.token)}
                          >
                            {f.token}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </div>

            <div className="tpl-editor-pane">
              <div className="tpl-pane-head">
                <span>Preview</span>
                <span className="tpl-pane-note">sample data</span>
              </div>
              {preview.error ? (
                <div className="tpl-preview tpl-preview--error">
                  <p>Template error: {preview.error}</p>
                  <p className="tpl-preview-hint">
                    Check that every {'{{ range }}'}, {'{{ if }}'} and {'{{ with }}'} has
                    a matching {'{{ end }}'}.
                  </p>
                </div>
              ) : (
                <iframe
                  className="tpl-preview"
                  title="Template preview"
                  sandbox=""
                  srcDoc={previewDoc}
                />
              )}
            </div>
          </div>

          {saveError && <p className="tpl-error">{saveError}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!formValid || saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
