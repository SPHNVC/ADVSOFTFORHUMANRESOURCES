import { useMemo, useState } from 'react'
import { useApolloClient } from '@apollo/client/react'
import AuthContext from './authContextInstance.js'

function readStoredUser() {
  try {
    const raw = localStorage.getItem('authUser')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const client = useApolloClient()
  const [token, setToken] = useState(() => localStorage.getItem('authToken'))
  const [user, setUser] = useState(readStoredUser)

  const value = useMemo(() => ({
    token,
    user,
    login(newToken, newUser) {
      localStorage.setItem('authToken', newToken)
      localStorage.setItem('authUser', JSON.stringify(newUser))
      setToken(newToken)
      setUser(newUser)
    },
    logout() {
      localStorage.removeItem('authToken')
      localStorage.removeItem('authUser')
      setToken(null)
      setUser(null)
      client.clearStore()
    },
  }), [token, user, client])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
