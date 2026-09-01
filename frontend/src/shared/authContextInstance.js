import { createContext } from 'react'

// Split into its own file (rather than living in AuthContext.jsx or useAuth.js)
// so those two can each stay single-purpose — a component-only file and a
// hook-only file — which is what react-refresh/only-export-components wants.
const AuthContext = createContext(null)

export default AuthContext
