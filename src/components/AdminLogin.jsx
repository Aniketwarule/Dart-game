import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AdminLogin({ onSuccess }) {
  const { login } = useAuth()
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (login(pw)) {
      onSuccess?.()
    } else {
      setError('Incorrect password. Try again.')
      setPw('')
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box">
        <div className="modal-title">🔒 Admin Login</div>
        <div className="modal-sub">Enter the admin password to manage matches and players.</div>
        {error && <div className="modal-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 16 }}>
            <label className="field-label">Password</label>
            <input
              id="admin-password-input"
              type="password"
              className="field-input"
              placeholder="••••••••"
              value={pw}
              onChange={e => { setPw(e.target.value); setError('') }}
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full btn-lg">
            UNLOCK
          </button>
        </form>
      </div>
    </div>
  )
}
