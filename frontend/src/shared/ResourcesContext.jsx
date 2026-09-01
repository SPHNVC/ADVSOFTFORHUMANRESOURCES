import { createContext, useContext, useRef, useState } from 'react'

const ResourcesContext = createContext(null)

const INITIAL_RESOURCES = [
  {
    id: 1,
    name: 'Alice Thornton',
    phone: '+1 555-0401',
    email: 'alice@example.com',
    status: 'New',
    profileStatus: true,
    modifiedBy: 'admin',
    modifiedAt: '2026-05-09 10:00',
    createdBy: 'admin',
    createdAt: '2026-04-10 08:45',
    skills: [],
    comments: [
      { id: 1, author: 'admin', text: 'CV submitted for review.', at: '2026-04-11 09:00' },
    ],
  },
  {
    id: 2,
    name: 'Daniel Reeves',
    phone: '+1 555-0402',
    email: 'daniel@example.com',
    status: 'In process of assignment',
    profileStatus: false,
    modifiedBy: 'admin',
    modifiedAt: '2026-05-08 16:20',
    createdBy: 'admin',
    createdAt: '2026-03-22 11:30',
    skills: [],
    comments: [],
  },
  {
    id: 3,
    name: 'Sophie Grant',
    phone: '+1 555-0403',
    email: 'sophie@example.com',
    status: 'Assigned to client',
    profileStatus: true,
    modifiedBy: 'admin',
    modifiedAt: '2026-05-07 14:05',
    createdBy: 'admin',
    createdAt: '2026-02-14 09:15',
    skills: [],
    comments: [],
  },
]

export function ResourcesProvider({ children }) {
  const [resources, setResources] = useState(INITIAL_RESOURCES)
  const nextResourceId = useRef(INITIAL_RESOURCES.length + 1)
  const nextCommentIds = useRef({})

  function addResource(fields, now) {
    const id = nextResourceId.current++
    setResources(prev => [
      ...prev,
      { id, ...fields, modifiedBy: 'admin', modifiedAt: now, createdBy: 'admin', createdAt: now, skills: [], comments: [] },
    ])
  }

  function toggleResourceSkill(resourceId, skillId) {
    setResources(prev =>
      prev.map(r => {
        if (r.id !== resourceId) return r
        const current = r.skills ?? []
        const next = current.includes(skillId)
          ? current.filter(id => id !== skillId)
          : [...current, skillId]
        return { ...r, skills: next }
      })
    )
  }

  function addComment(resourceId, text, now) {
    if (!nextCommentIds.current[resourceId]) nextCommentIds.current[resourceId] = 100
    const commentId = nextCommentIds.current[resourceId]++
    setResources(prev =>
      prev.map(r =>
        r.id !== resourceId
          ? r
          : {
              ...r,
              comments: [...r.comments, { id: commentId, author: 'admin', text, at: now }],
              modifiedBy: 'admin',
              modifiedAt: now,
            }
      )
    )
  }

  return (
    <ResourcesContext.Provider value={{ resources, addResource, toggleResourceSkill, addComment }}>
      {children}
    </ResourcesContext.Provider>
  )
}

export function useResources() {
  return useContext(ResourcesContext)
}
