import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client/react'
import { useAuth } from '../../../shared/useAuth.js'
import { LOGIN_MUTATION } from '../auth.gql.js'
import './Login.css'

const EMPTY_FORM = { usernameOrEmail: '', password: '' }

export default function Login() {
  const { token, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_FORM)

  const [loginMutation, { loading, error }] = useMutation(LOGIN_MUTATION)

  if (token) return <Navigate to="/" replace />

  function handleFormChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const { data } = await loginMutation({
      variables: { input: form },
    }).catch(() => ({ data: null }))
    if (data?.login) {
      login(data.login.token, data.login.user)
      navigate('/')
    }
  }

  const formValid = form.usernameOrEmail.trim() && form.password

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-title">CRM</h1>
        <p className="login-subtitle">Sign in to continue</p>

        <label>
          Username or email
          <input
            name="usernameOrEmail"
            value={form.usernameOrEmail}
            onChange={handleFormChange}
            placeholder="e.g. admin or admin@test.com"
            autoFocus
            autoComplete="username"
          />
        </label>

        <label>
          Password
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleFormChange}
            autoComplete="current-password"
          />
        </label>

        {error && (
          <p className="error-state login-error">Invalid username/email or password.</p>
        )}

        <button type="submit" className="btn-primary login-submit" disabled={!formValid || loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
