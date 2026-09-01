import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { CREATE_RESOURCE_MUTATION, RESOURCES_QUERY } from '../resources.gql.js'
import './AddResource.css'

const EMPTY_FORM = {
  name: '', birthdate: '', phone: '', email: '',
  street: '', number: '', block: '', flat: '',
  zipCode: '', city: '', county: '', country: '',
  drivingLicence: false, car: false, availability: '',
}

export default function AddResource({ onClose }) {
  const [form, setForm] = useState(EMPTY_FORM)

  const [createResource] = useMutation(CREATE_RESOURCE_MUTATION, {
    refetchQueries: [{ query: RESOURCES_QUERY }],
  })

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    await createResource({
      variables: {
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
    onClose()
  }

  const formValid = form.name.trim()

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add new resource</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <fieldset className="form-section">
            <legend>Basic info</legend>

            <label>
              Resource name <span className="required">*</span>
              <input name="name" value={form.name} onChange={handleChange}
                placeholder="e.g. John Smith" required autoFocus />
            </label>

            <label>
              Birthdate
              <input name="birthdate" type="date" value={form.birthdate} onChange={handleChange} />
            </label>

            <label>
              Phone
              <input name="phone" value={form.phone} onChange={handleChange}
                placeholder="e.g. +1 555-0404" />
            </label>

            <label>
              Email
              <input name="email" type="email" value={form.email} onChange={handleChange}
                placeholder="e.g. john@example.com" />
            </label>

          </fieldset>

          <fieldset className="form-section">
            <legend>Address</legend>

            <div className="form-row">
              <label className="flex-3">
                Street
                <input name="street" value={form.street} onChange={handleChange} placeholder="e.g. Main St" />
              </label>
              <label className="flex-1">
                Number
                <input name="number" value={form.number} onChange={handleChange} placeholder="12" />
              </label>
            </div>

            <div className="form-row">
              <label>
                Block
                <input name="block" value={form.block} onChange={handleChange} placeholder="A" />
              </label>
              <label>
                Flat
                <input name="flat" value={form.flat} onChange={handleChange} placeholder="4" />
              </label>
              <label>
                Zip code
                <input name="zipCode" value={form.zipCode} onChange={handleChange} placeholder="10001" />
              </label>
            </div>

            <div className="form-row">
              <label>
                City
                <input name="city" value={form.city} onChange={handleChange} placeholder="New York" />
              </label>
              <label>
                County
                <input name="county" value={form.county} onChange={handleChange} placeholder="New York" />
              </label>
            </div>

            <label>
              Country
              <input name="country" value={form.country} onChange={handleChange} placeholder="USA" />
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
                <option value="">— select —</option>
                <option value="ASAP">ASAP</option>
                <option value="ONE_WEEK">1 week</option>
                <option value="TWO_WEEKS">2 weeks</option>
                <option value="THREE_WEEKS">3 weeks</option>
              </select>
            </label>
          </fieldset>

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!formValid}>Add resource</button>
          </div>
        </form>
      </div>
    </div>
  )
}
