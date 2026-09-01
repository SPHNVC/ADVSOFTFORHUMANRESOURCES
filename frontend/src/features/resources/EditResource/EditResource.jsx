import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client/react'
import {
  RESOURCE_QUERY,
  UPDATE_RESOURCE_MUTATION,
  RESOURCES_QUERY,
  TOGGLE_RESOURCE_SKILL_MUTATION,
  RESOURCE_COMMENTS_QUERY,
  ADD_RESOURCE_COMMENT_MUTATION,
} from '../resources.gql.js'
import {
  RESOURCE_ACTIVITIES_QUERY,
  CREATE_RESOURCE_ACTIVITY_MUTATION,
  UPDATE_RESOURCE_ACTIVITY_MUTATION,
  DELETE_RESOURCE_ACTIVITY_MUTATION,
} from '../resourceActivities.gql.js'
import { SKILLS_QUERY } from '../../skills/skills.gql.js'
import GenerateCv from '../GenerateCv/GenerateCv.jsx'
import LanguageSection from '../LanguageSection/LanguageSection.jsx'
import './EditResource.css'

const AVAILABILITY_LABELS = {
  ASAP: 'ASAP',
  ONE_WEEK: '1 week',
  TWO_WEEKS: '2 weeks',
  THREE_WEEKS: '3 weeks',
}

function toForm(r) {
  return {
    name: r.name ?? '',
    birthdate: r.birthdate ?? '',
    phone: r.phone ?? '',
    email: r.email ?? '',
    street: r.street ?? '',
    number: r.number ?? '',
    block: r.block ?? '',
    flat: r.flat ?? '',
    zipCode: r.zipCode ?? '',
    city: r.city ?? '',
    county: r.county ?? '',
    country: r.country ?? '',
    drivingLicence: r.drivingLicence ?? false,
    car: r.car ?? false,
    availability: r.availability ?? '',
  }
}

export default function EditResource() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data, loading, error } = useQuery(RESOURCE_QUERY, { variables: { id } })
  const { data: skillsData } = useQuery(SKILLS_QUERY)

  const [updateResource, { loading: saving }] = useMutation(UPDATE_RESOURCE_MUTATION, {
    refetchQueries: [{ query: RESOURCES_QUERY }, { query: RESOURCE_QUERY, variables: { id } }],
  })
  const [toggleSkill] = useMutation(TOGGLE_RESOURCE_SKILL_MUTATION, {
    refetchQueries: [{ query: RESOURCE_QUERY, variables: { id } }],
  })
  const [addComment] = useMutation(ADD_RESOURCE_COMMENT_MUTATION)

  const [form, setForm] = useState(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [saved, setSaved] = useState(false)
  const [cvModalOpen, setCvModalOpen] = useState(false)
  const activitySectionRef = useRef(null)

  const resource = data?.resource
  const skills = skillsData?.skills ?? []

  useEffect(() => {
    if (resource && !form) setForm(toForm(resource))
  }, [resource])

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    setSaved(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    await updateResource({
      variables: {
        id,
        input: {
          name: form.name,
          birthdate: form.birthdate || null,
          phone: form.phone || null,
          email: form.email || null,
          street: form.street || null,
          number: form.number || null,
          block: form.block || null,
          flat: form.flat || null,
          zipCode: form.zipCode || null,
          city: form.city || null,
          county: form.county || null,
          country: form.country || null,
          drivingLicence: form.drivingLicence,
          car: form.car,
          availability: form.availability || null,
        },
      },
    })
    await activitySectionRef.current?.saveAll()
    setSaved(true)
  }

  async function handleToggleSkill(skillId) {
    await toggleSkill({ variables: { resourceId: id, skillId } })
  }

  const { data: commentsData, loading: commentsLoading } = useQuery(RESOURCE_COMMENTS_QUERY, {
    variables: { resourceId: id },
  })
  const comments = commentsData?.resourceComments ?? []

  async function saveComment() {
    const text = commentDraft.trim()
    if (!text) return
    await addComment({
      variables: { input: { entityId: id, text } },
      refetchQueries: [{ query: RESOURCE_COMMENTS_QUERY, variables: { resourceId: id } }],
    })
    setCommentDraft('')
  }

  function handleCommentKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveComment()
    }
  }

  if (loading) return <p className="edit-state">Loading…</p>
  if (error || !resource) return <p className="edit-state edit-state--error">Resource not found.</p>
  if (!form) return null

  const formValid = form.name.trim()

  return (
    <div className="edit-resource-page">
      <div className="edit-resource-header">
        <button className="btn-back" onClick={() => navigate('/resources')}>
          ← Back to resources
        </button>
        <h2 className="edit-resource-title">{resource.name}</h2>
        <button className="btn-primary btn-generate-cv" onClick={() => setCvModalOpen(true)}>
          Generate CV
        </button>
      </div>

      <div className="edit-resource-layout">
        <form className="edit-form" onSubmit={handleSubmit}>

          <fieldset className="form-section">
            <legend>Basic info</legend>

            <label>
              Resource name <span className="required">*</span>
              <input name="name" value={form.name} onChange={handleChange} required />
            </label>

            <label>
              Birthdate
              <input name="birthdate" type="date" value={form.birthdate} onChange={handleChange} />
            </label>

            <label>
              Phone
              <input name="phone" value={form.phone} onChange={handleChange} />
            </label>

            <label>
              Email
              <input name="email" type="email" value={form.email} onChange={handleChange} />
            </label>

          </fieldset>

          <fieldset className="form-section">
            <legend>Address</legend>

            <div className="form-row">
              <label className="flex-3">
                Street
                <input name="street" value={form.street} onChange={handleChange} />
              </label>
              <label className="flex-1">
                Number
                <input name="number" value={form.number} onChange={handleChange} />
              </label>
            </div>

            <div className="form-row">
              <label>
                Block
                <input name="block" value={form.block} onChange={handleChange} />
              </label>
              <label>
                Flat
                <input name="flat" value={form.flat} onChange={handleChange} />
              </label>
              <label>
                Zip code
                <input name="zipCode" value={form.zipCode} onChange={handleChange} />
              </label>
            </div>

            <div className="form-row">
              <label>
                City
                <input name="city" value={form.city} onChange={handleChange} />
              </label>
              <label>
                County
                <input name="county" value={form.county} onChange={handleChange} />
              </label>
            </div>

            <label>
              Country
              <input name="country" value={form.country} onChange={handleChange} />
            </label>
          </fieldset>

          <fieldset className="form-section">
            <legend>Mobility & availability</legend>

            <div className="form-row">
              <label className="label-checkbox">
                <input type="checkbox" name="drivingLicence" checked={form.drivingLicence} onChange={handleChange} />
                Driving licence
              </label>
              <label className="label-checkbox">
                <input type="checkbox" name="car" checked={form.car} onChange={handleChange} />
                Has car
              </label>
            </div>

            <label>
              Availability
              <select name="availability" value={form.availability} onChange={handleChange}>
                <option value="">— none —</option>
                <option value="ASAP">ASAP</option>
                <option value="ONE_WEEK">1 week</option>
                <option value="TWO_WEEKS">2 weeks</option>
                <option value="THREE_WEEKS">3 weeks</option>
              </select>
            </label>
          </fieldset>

          <fieldset className="form-section">
            <legend>Languages</legend>
            <LanguageSection resourceId={id} />
          </fieldset>

          <fieldset className="form-section">
            <legend>Activity</legend>
            <ActivitySection ref={activitySectionRef} resourceId={id} />
          </fieldset>

          <div className="edit-form-actions">
            {saved && <span className="save-indicator">Saved</span>}
            <button type="submit" className="btn-primary" disabled={!formValid || saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>

        <aside className="edit-sidebar">
          <section className="sidebar-section">
            <h3 className="sidebar-heading">Skills</h3>
            {skills.length === 0 && <p className="sidebar-empty">No skills defined.</p>}
            <div className="skills-chips">
              {skills.map(skill => {
                const checked = (resource.skillIds ?? []).includes(skill.id)
                return (
                  <label key={skill.id} className={`skill-chip${checked ? ' selected' : ''}`}>
                    <input type="checkbox" checked={checked} onChange={() => handleToggleSkill(skill.id)} />
                    {skill.name}
                  </label>
                )
              })}
            </div>
          </section>

          <section className="sidebar-section">
            <h3 className="sidebar-heading">Comments</h3>

            {commentsLoading && <p className="sidebar-empty">Loading…</p>}
            {!commentsLoading && comments.length === 0 && (
              <p className="sidebar-empty">No comments yet.</p>
            )}
            {!commentsLoading && comments.length > 0 && (
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
                onChange={e => setCommentDraft(e.target.value)}
                onKeyDown={handleCommentKeyDown}
              />
              <button className="btn-save-comment" onClick={saveComment}>Save</button>
            </div>
          </section>

          <section className="sidebar-section sidebar-meta">
            <h3 className="sidebar-heading">Meta</h3>
            <dl className="meta-list">
              <dt>Created by</dt><dd>{resource.createdBy}</dd>
              <dt>Created at</dt><dd>{resource.createdAt}</dd>
              <dt>Modified by</dt><dd>{resource.modifiedBy}</dd>
              <dt>Modified at</dt><dd>{resource.modifiedAt}</dd>
            </dl>
          </section>
        </aside>
      </div>

      {cvModalOpen && (
        <GenerateCv resourceId={id} onClose={() => setCvModalOpen(false)} />
      )}
    </div>
  )
}

function dateToMonth(dateValue) {
  return dateValue ? dateValue.slice(0, 7) : ''
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 62 }, (_, i) => CURRENT_YEAR + 1 - i)

function splitMonthValue(value) {
  if (!value) return { year: '', month: '' }
  const [year, month] = value.split('-')
  return { year: year ?? '', month: month ?? '' }
}

function combineMonthValue(year, month) {
  return year && month ? `${year}-${month}` : ''
}

let nextDraftId = 1

function emptyActivityDraft() {
  return {
    draftId: nextDraftId++, id: null, name: '', description: '',
    startMonth: '', startYear: '', endMonth: '', endYear: '',
  }
}

const ActivitySection = forwardRef(function ActivitySection({ resourceId }, ref) {
  const { data, loading } = useQuery(RESOURCE_ACTIVITIES_QUERY, { variables: { resourceId } })
  const [createActivity] = useMutation(CREATE_RESOURCE_ACTIVITY_MUTATION, {
    refetchQueries: [{ query: RESOURCE_ACTIVITIES_QUERY, variables: { resourceId } }],
  })
  const [updateActivity] = useMutation(UPDATE_RESOURCE_ACTIVITY_MUTATION, {
    refetchQueries: [{ query: RESOURCE_ACTIVITIES_QUERY, variables: { resourceId } }],
  })
  const [deleteActivity] = useMutation(DELETE_RESOURCE_ACTIVITY_MUTATION, {
    refetchQueries: [{ query: RESOURCE_ACTIVITIES_QUERY, variables: { resourceId } }],
  })

  const [drafts, setDrafts] = useState([])
  const activities = data?.resourceActivities ?? []

  useEffect(() => {
    if (loading) return
    if (activities.length === 0) {
      setDrafts([emptyActivityDraft()])
    } else {
      setDrafts(activities.map(a => {
        const start = splitMonthValue(dateToMonth(a.startDate))
        const end = splitMonthValue(dateToMonth(a.endDate))
        return {
          draftId: a.id,
          id: a.id,
          name: a.name,
          description: a.description ?? '',
          startMonth: start.month,
          startYear: start.year,
          endMonth: end.month,
          endYear: end.year,
        }
      }))
    }
  }, [loading, activities.length])

  function updateDraft(draftId, field, value) {
    setDrafts(prev => prev.map(d => (d.draftId === draftId ? { ...d, [field]: value } : d)))
  }

  function isValid(draft) {
    const startDate = combineMonthValue(draft.startYear, draft.startMonth)
    const endDate = combineMonthValue(draft.endYear, draft.endMonth)
    return draft.name.trim() && startDate && endDate && endDate >= startDate
  }

  function isBlank(draft) {
    return !draft.name.trim() && !draft.description.trim()
      && !draft.startMonth && !draft.startYear && !draft.endMonth && !draft.endYear
  }

  async function persistDraft(draft) {
    if (isBlank(draft) || !isValid(draft)) return
    const input = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      startDate: combineMonthValue(draft.startYear, draft.startMonth),
      endDate: combineMonthValue(draft.endYear, draft.endMonth),
    }
    if (draft.id) {
      await updateActivity({ variables: { id: draft.id, input } })
    } else {
      await createActivity({ variables: { input: { ...input, resourceId } } })
    }
  }

  async function handleDelete(draft) {
    if (!draft.id) {
      setDrafts(prev => prev.filter(d => d.draftId !== draft.draftId))
      return
    }
    await deleteActivity({ variables: { id: draft.id } })
  }

  function handleAddActivity() {
    setDrafts(prev => [...prev, emptyActivityDraft()])
  }

  useImperativeHandle(ref, () => ({
    async saveAll() {
      for (const draft of drafts) {
        await persistDraft(draft)
      }
    },
  }), [drafts])

  if (loading) return <p className="sidebar-empty">Loading activities…</p>

  return (
    <div className="activity-section">
      {drafts.map(draft => {
        const startDate = combineMonthValue(draft.startYear, draft.startMonth)
        const endDate = combineMonthValue(draft.endYear, draft.endMonth)
        const dateOrderInvalid = startDate && endDate && endDate < startDate
        return (
          <div key={draft.draftId} className="activity-row">
            <div className="form-row">
              <label className="flex-3">
                Activity name <span className="required">*</span>
                <input
                  value={draft.name}
                  onChange={e => updateDraft(draft.draftId, 'name', e.target.value)}
                  placeholder="e.g. Project onboarding"
                />
              </label>
              <button
                type="button"
                className="btn-danger btn-delete-activity"
                onClick={() => handleDelete(draft)}
              >
                Delete
              </button>
            </div>

            <label>
              Description
              <textarea
                rows={2}
                value={draft.description}
                onChange={e => updateDraft(draft.draftId, 'description', e.target.value)}
              />
            </label>

            <div className="form-row">
              <label>
                Start date
                <div className="month-year-select">
                  <select
                    value={draft.startMonth}
                    onChange={e => updateDraft(draft.draftId, 'startMonth', e.target.value)}
                  >
                    <option value="">Month</option>
                    {MONTH_NAMES.map((name, i) => (
                      <option key={name} value={String(i + 1).padStart(2, '0')}>{name}</option>
                    ))}
                  </select>
                  <select
                    value={draft.startYear}
                    onChange={e => updateDraft(draft.draftId, 'startYear', e.target.value)}
                  >
                    <option value="">Year</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </label>
              <label>
                End date
                <div className="month-year-select">
                  <select
                    value={draft.endMonth}
                    onChange={e => updateDraft(draft.draftId, 'endMonth', e.target.value)}
                  >
                    <option value="">Month</option>
                    {MONTH_NAMES.map((name, i) => (
                      <option key={name} value={String(i + 1).padStart(2, '0')}>{name}</option>
                    ))}
                  </select>
                  <select
                    value={draft.endYear}
                    onChange={e => updateDraft(draft.draftId, 'endYear', e.target.value)}
                  >
                    <option value="">Year</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </label>
            </div>

            {dateOrderInvalid && (
              <p className="activity-error">End date must not be before start date.</p>
            )}
          </div>
        )
      })}

      <button type="button" className="btn-primary btn-add-activity" onClick={handleAddActivity}>
        + Add new activity
      </button>
    </div>
  )
})
