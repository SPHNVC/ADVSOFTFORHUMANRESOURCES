import { createContext, useContext, useRef, useState } from 'react'

const SkillsContext = createContext(null)

const INITIAL_SKILLS = [
  { id: 1, name: 'React', description: 'Frontend library' },
  { id: 2, name: 'Go', description: 'Backend language' },
  { id: 3, name: 'PostgreSQL', description: 'Relational database' },
]

export function SkillsProvider({ children }) {
  const [skills, setSkills] = useState(INITIAL_SKILLS)
  const nextId = useRef(INITIAL_SKILLS.length + 1)

  function addSkill(name, description) {
    const id = nextId.current++
    setSkills(prev => [...prev, { id, name: name.trim(), description: description.trim() }])
  }

  function removeSkill(id) {
    setSkills(prev => prev.filter(s => s.id !== id))
  }

  return (
    <SkillsContext.Provider value={{ skills, addSkill, removeSkill }}>
      {children}
    </SkillsContext.Provider>
  )
}

export function useSkills() {
  return useContext(SkillsContext)
}
