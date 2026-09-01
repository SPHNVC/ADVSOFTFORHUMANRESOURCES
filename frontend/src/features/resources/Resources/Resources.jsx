import { useQuery, useMutation } from '@apollo/client/react'
import { useNavigate } from 'react-router-dom'
import {
  RESOURCES_QUERY,
  DELETE_RESOURCE_MUTATION,
  BLOCK_RESOURCE_MUTATION,
} from '../resources.gql.js'
import AddResource from '../AddResource/AddResource.jsx'
import { useState } from 'react'
import useSortableList from '../../../shared/useSortableList.js'
import SortableHeader from '../../../shared/SortableHeader.jsx'
import './Resources.css'

const STATUS_LABELS = {
  FREE: 'Free',
  ASSIGNED_TO_PROJECT: 'Assigned to project',
  BLACKLIST: 'Blacklist',
}

const STATUS_CLASSES = {
  FREE: 'badge-free',
  ASSIGNED_TO_PROJECT: 'badge-assigned',
  BLACKLIST: 'badge-blacklist',
}

const AVAILABILITY_LABELS = {
  ASAP: 'ASAP',
  ONE_WEEK: '1 week',
  TWO_WEEKS: '2 weeks',
  THREE_WEEKS: '3 weeks',
}

export default function Resources() {
  const navigate = useNavigate()
  const { data, loading, error } = useQuery(RESOURCES_QUERY)

  const [deleteResource] = useMutation(DELETE_RESOURCE_MUTATION, {
    refetchQueries: [{ query: RESOURCES_QUERY }],
  })
  const [blockResource] = useMutation(BLOCK_RESOURCE_MUTATION, {
    refetchQueries: [{ query: RESOURCES_QUERY }],
  })

  const [modalOpen, setModalOpen] = useState(false)

  const resources = data?.resources ?? []
  const { sorted: sortedResources, sortKey, sortDirection, toggleSort } = useSortableList(resources, 'modifiedAt')

  async function handleDelete(e, id) {
    e.stopPropagation()
    await deleteResource({ variables: { id } })
  }

  async function handleBlock(e, id) {
    e.stopPropagation()
    await blockResource({ variables: { id } })
  }

  return (
    <div className="resources-page">
      <div className="resources-header">
        <h2 className="resources-title">Resources</h2>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>
          + Add new resource
        </button>
      </div>

      {loading && <p className="loading-state">Loading resources…</p>}
      {error && <p className="error-state">Failed to load resources: {error.message}</p>}

      {!loading && !error && (
        <div className="table-wrapper">
          <table className="resources-table">
            <thead>
              <tr>
                <th><SortableHeader label="Resource name" sortKey="name" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th><SortableHeader label="Birthdate" sortKey="birthdate" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th><SortableHeader label="Driving licence" sortKey="drivingLicence" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th><SortableHeader label="Car" sortKey="car" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th><SortableHeader label="Phone number" sortKey="phone" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th><SortableHeader label="Disponibility" sortKey="availability" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th><SortableHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th><SortableHeader label="Modified at" sortKey="modifiedAt" activeKey={sortKey} direction={sortDirection} onSort={toggleSort} /></th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sortedResources.map(resource => (
                <tr
                  key={resource.id}
                  className="resource-row"
                  onClick={() => navigate(`/resources/${resource.id}`)}
                >
                  <td className="cell-primary">{resource.name}</td>
                  <td>{resource.birthdate ?? '—'}</td>
                  <td>
                    <span className={`bool-badge ${resource.drivingLicence ? 'bool-yes' : 'bool-no'}`}>
                      {resource.drivingLicence ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td>
                    <span className={`bool-badge ${resource.car ? 'bool-yes' : 'bool-no'}`}>
                      {resource.car ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td>{resource.phone ?? '—'}</td>
                  <td>{AVAILABILITY_LABELS[resource.availability] ?? '—'}</td>
                  <td>
                    <span className={`status-badge ${STATUS_CLASSES[resource.status] ?? ''}`}>
                      {STATUS_LABELS[resource.status] ?? resource.status}
                    </span>
                  </td>
                  <td>{resource.modifiedAt}</td>
                  <td className="col-actions" onClick={e => e.stopPropagation()}>
                    {resource.status !== 'BLACKLIST' && (
                      <button className="btn-block" onClick={e => handleBlock(e, resource.id)}>
                        Block
                      </button>
                    )}
                    <button className="btn-danger" onClick={e => handleDelete(e, resource.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && <AddResource onClose={() => setModalOpen(false)} />}
    </div>
  )
}
