import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth.js'
import './Navbar.css'

const links = [
  { to: '/projects', label: 'Projects' },
  { to: '/resources', label: 'Resources' },
  { to: '/availability', label: 'Availability' },
  { to: '/reports', label: 'Reports' },
  { to: '/skills', label: 'Skills' },
  { to: '/cv-templates', label: 'CV templates' },
]

function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <span className="navbar-brand">CRM</span>
      <ul className="navbar-links">
        {links.map(({ to, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) => isActive ? 'active' : undefined}
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
      {user && (
        <div className="navbar-user">
          <span className="navbar-user-name">{user.displayName}</span>
          <button className="navbar-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      )}
    </nav>
  )
}

export default Navbar
