import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import {
  LANGUAGES_QUERY,
  RESOURCE_LANGUAGES_QUERY,
  SET_RESOURCE_LANGUAGE_MUTATION,
  REMOVE_RESOURCE_LANGUAGE_MUTATION,
  CREATE_LANGUAGE_MUTATION,
  LANGUAGE_LEVELS,
} from '../languages.gql.js'
import './LanguageSection.css'

const DEFAULT_LEVEL = 'B2'

export default function LanguageSection({ resourceId }) {
  const { data: catalogData } = useQuery(LANGUAGES_QUERY)
  const { data, loading } = useQuery(RESOURCE_LANGUAGES_QUERY, {
    variables: { resourceId },
  })

  const refetchResource = {
    refetchQueries: [{ query: RESOURCE_LANGUAGES_QUERY, variables: { resourceId } }],
  }
  const [setResourceLanguage] = useMutation(SET_RESOURCE_LANGUAGE_MUTATION, refetchResource)
  const [removeResourceLanguage] = useMutation(REMOVE_RESOURCE_LANGUAGE_MUTATION, refetchResource)
  const [createLanguage] = useMutation(CREATE_LANGUAGE_MUTATION, {
    refetchQueries: [{ query: LANGUAGES_QUERY }],
  })

  const [pickedLanguageId, setPickedLanguageId] = useState('')
  const [pickedLevel, setPickedLevel] = useState(DEFAULT_LEVEL)
  const [newLanguageName, setNewLanguageName] = useState('')
  const [addingNew, setAddingNew] = useState(false)
  const [error, setError] = useState(null)

  const catalog = catalogData?.languages ?? []
  const resourceLanguages = data?.resourceLanguages ?? []

  // Languages the resource already knows are not offered again — use the row's
  // own level dropdown to change them instead.
  const takenIds = new Set(resourceLanguages.map(l => l.languageId))
  const available = catalog.filter(l => !takenIds.has(l.id))

  async function handleAdd() {
    if (!pickedLanguageId) return
    setError(null)
    try {
      await setResourceLanguage({
        variables: {
          input: { resourceId, languageId: pickedLanguageId, level: pickedLevel },
        },
      })
      setPickedLanguageId('')
      setPickedLevel(DEFAULT_LEVEL)
    } catch (err) {
      setError(err.message ?? 'Failed to add the language.')
    }
  }

  async function handleLevelChange(languageId, level) {
    setError(null)
    try {
      await setResourceLanguage({
        variables: { input: { resourceId, languageId, level } },
      })
    } catch (err) {
      setError(err.message ?? 'Failed to update the level.')
    }
  }

  async function handleRemove(languageId) {
    setError(null)
    try {
      await removeResourceLanguage({ variables: { resourceId, languageId } })
    } catch (err) {
      setError(err.message ?? 'Failed to remove the language.')
    }
  }

  async function handleCreateLanguage() {
    const name = newLanguageName.trim()
    if (!name) return
    setError(null)
    try {
      const { data: created } = await createLanguage({ variables: { input: { name } } })
      const newId = created?.createLanguage?.id
      setNewLanguageName('')
      setAddingNew(false)
      // Attach the freshly created language straight away — that is why the
      // user added it.
      if (newId) {
        await setResourceLanguage({
          variables: { input: { resourceId, languageId: newId, level: pickedLevel } },
        })
      }
    } catch (err) {
      setError(err.message ?? 'Failed to create the language.')
    }
  }

  if (loading) return <p className="lang-empty">Loading languages…</p>

  return (
    <div className="language-section">
      {resourceLanguages.length === 0 && (
        <p className="lang-empty">No languages added yet.</p>
      )}

      {resourceLanguages.length > 0 && (
        <ul className="lang-list">
          {resourceLanguages.map(rl => (
            <li key={rl.id} className="lang-row">
              <span className="lang-name">{rl.name}</span>
              <select
                className="lang-level"
                value={rl.level}
                onChange={e => handleLevelChange(rl.languageId, e.target.value)}
                aria-label={`Proficiency in ${rl.name}`}
              >
                {LANGUAGE_LEVELS.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
              <button
                type="button"
                className="btn-remove"
                onClick={() => handleRemove(rl.languageId)}
                aria-label={`Remove ${rl.name}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {!addingNew ? (
        <div className="lang-add">
          <select
            className="lang-picker"
            value={pickedLanguageId}
            onChange={e => setPickedLanguageId(e.target.value)}
            aria-label="Language to add"
          >
            <option value="">— select a language —</option>
            {available.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <select
            className="lang-level"
            value={pickedLevel}
            onChange={e => setPickedLevel(e.target.value)}
            aria-label="Proficiency level"
          >
            {LANGUAGE_LEVELS.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn-primary"
            onClick={handleAdd}
            disabled={!pickedLanguageId}
          >
            Add
          </button>
          <button
            type="button"
            className="btn-link"
            onClick={() => setAddingNew(true)}
          >
            New language…
          </button>
        </div>
      ) : (
        <div className="lang-add">
          <input
            className="lang-new-input"
            value={newLanguageName}
            onChange={e => setNewLanguageName(e.target.value)}
            placeholder="e.g. Norwegian"
            aria-label="New language name"
          />
          <select
            className="lang-level"
            value={pickedLevel}
            onChange={e => setPickedLevel(e.target.value)}
            aria-label="Proficiency level"
          >
            {LANGUAGE_LEVELS.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn-primary"
            onClick={handleCreateLanguage}
            disabled={!newLanguageName.trim()}
          >
            Create &amp; add
          </button>
          <button
            type="button"
            className="btn-link"
            onClick={() => { setAddingNew(false); setNewLanguageName(''); setError(null) }}
          >
            Cancel
          </button>
        </div>
      )}

      {error && <p className="lang-error">{error}</p>}
    </div>
  )
}
