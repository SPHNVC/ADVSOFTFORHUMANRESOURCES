import { createContext, useContext, useRef, useState } from 'react'

const ProjectsContext = createContext(null)

const INITIAL_PROJECTS = [
  {
    id: 1,
    name: 'Alpha Redesign',
    contactPerson: 'Jane Cooper',
    phone: '+1 555-0101',
    email: 'jane@alpha.com',
    modifiedBy: 'admin',
    modifiedAt: '2026-05-08 14:32',
    createdBy: 'admin',
    createdAt: '2026-04-01 09:00',
    skills: [],
    comments: [
      { id: 1, author: 'admin', text: 'Initial kickoff scheduled.', at: '2026-04-02 10:15' },
      { id: 2, author: 'jane', text: 'Design mockups reviewed.', at: '2026-04-15 11:00' },
    ],
  },
  {
    id: 2,
    name: 'Beta Integration',
    contactPerson: 'Mark Evans',
    phone: '+1 555-0202',
    email: 'mark@beta.io',
    modifiedBy: 'admin',
    modifiedAt: '2026-05-07 09:12',
    createdBy: 'admin',
    createdAt: '2026-03-15 08:30',
    skills: [],
    comments: [],
  },
]

export function ProjectsProvider({ children }) {
  const [projects, setProjects] = useState(INITIAL_PROJECTS)
  const nextProjectId = useRef(INITIAL_PROJECTS.length + 1)
  const nextCommentIds = useRef({})

  function addProject(fields, now) {
    const id = nextProjectId.current++
    setProjects(prev => [
      ...prev,
      { id, ...fields, modifiedBy: 'admin', modifiedAt: now, createdBy: 'admin', createdAt: now, skills: [], comments: [] },
    ])
  }

  function toggleProjectSkill(projectId, skillId) {
    setProjects(prev =>
      prev.map(p => {
        if (p.id !== projectId) return p
        const current = p.skills ?? []
        const next = current.includes(skillId)
          ? current.filter(id => id !== skillId)
          : [...current, skillId]
        return { ...p, skills: next }
      })
    )
  }

  function addComment(projectId, text, now) {
    if (!nextCommentIds.current[projectId]) nextCommentIds.current[projectId] = 100
    const commentId = nextCommentIds.current[projectId]++
    setProjects(prev =>
      prev.map(p =>
        p.id !== projectId
          ? p
          : {
              ...p,
              comments: [...p.comments, { id: commentId, author: 'admin', text, at: now }],
              modifiedBy: 'admin',
              modifiedAt: now,
            }
      )
    )
  }

  return (
    <ProjectsContext.Provider value={{ projects, addProject, toggleProjectSkill, addComment }}>
      {children}
    </ProjectsContext.Provider>
  )
}

export function useProjects() {
  return useContext(ProjectsContext)
}
