import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { CV_TEMPLATES_QUERY } from '../cv.gql.js'
import { useGenerateCv } from './useGenerateCv.js'
import './GenerateCv.css'

const FORMATS = [
  { value: 'PDF', label: 'PDF', hint: 'Opens the print dialog — choose “Save as PDF”.' },
  { value: 'DOCX', label: 'Word', hint: 'Downloads an editable .docx file.' },
]

export default function GenerateCv({ resourceId, onClose }) {
  const { data, loading, error: templatesError } = useQuery(CV_TEMPLATES_QUERY)
  const { generate, generating, error: generateError } = useGenerateCv(resourceId)

  const [format, setFormat] = useState('PDF')
  // null means "not chosen yet" — the default template stands in until then,
  // which avoids an effect that would only mirror server state into state.
  const [pickedTemplateId, setPickedTemplateId] = useState(null)

  const templates = data?.cvTemplates ?? []
  const defaultTemplateId =
    (templates.find(t => t.isDefault) ?? templates[0])?.id ?? ''
  const templateId = pickedTemplateId ?? defaultTemplateId

  async function handleSubmit(e) {
    e.preventDefault()
    if (await generate(templateId, format)) onClose()
  }

  const noTemplates = !loading && !templatesError && templates.length === 0
  const canSubmit = Boolean(templateId) && !generating

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal--narrow"
        role="dialog"
        aria-modal="true"
        aria-labelledby="generate-cv-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 id="generate-cv-title">Generate CV</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form className="cv-form" onSubmit={handleSubmit}>
          {loading && <p className="cv-state">Loading templates…</p>}

          {templatesError && (
            <p className="cv-state cv-state--error">
              Failed to load templates: {templatesError.message}
            </p>
          )}

          {noTemplates && (
            <p className="cv-state cv-state--error">
              No CV templates exist yet. Add one in Settings → CV templates.
            </p>
          )}

          {!loading && !templatesError && templates.length > 0 && (
            <>
              <label className="cv-field">
                Template
                <select
                  value={templateId}
                  onChange={e => setPickedTemplateId(e.target.value)}
                  required
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}{t.isDefault ? ' (default)' : ''}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className="cv-formats">
                <legend>File type</legend>
                {FORMATS.map(f => (
                  <label
                    key={f.value}
                    className={`cv-format ${format === f.value ? 'cv-format--active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="format"
                      value={f.value}
                      checked={format === f.value}
                      onChange={e => setFormat(e.target.value)}
                    />
                    <span className="cv-format-label">{f.label}</span>
                    <span className="cv-format-hint">{f.hint}</span>
                  </label>
                ))}
              </fieldset>
            </>
          )}

          {generateError && <p className="cv-state cv-state--error">{generateError}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!canSubmit}>
              {generating ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
