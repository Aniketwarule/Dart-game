import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAudio } from '../context/AudioContext'

export default function Header() {
  const { isAdmin } = useAuth()
  const { muted, setMuted } = useAudio()

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="header-logo">
          <span className="header-logo-icon">🎯</span>
          <span className="header-logo-text">DART PLATFORM</span>
        </Link>

        <nav className="header-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
          >
            <span className="live-dot" />
            <span>Live</span>
          </NavLink>

          <NavLink
            to="/leaderboard"
            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
          >
            <span>📊</span>
            <span>Leaderboard</span>
          </NavLink>

          <NavLink
            to="/history"
            className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
          >
            <span>📜</span>
            <span>History</span>
          </NavLink>

          <NavLink
            to="/admin"
            className={({ isActive }) => 'nav-link admin-link' + (isActive ? ' active' : '')}
          >
            <span>{isAdmin ? '🔓' : '🔒'}</span>
            <span>Admin</span>
          </NavLink>

          <button
            onClick={() => setMuted(!muted)}
            className="nav-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px', marginLeft: 8 }}
            title={muted ? 'Unmute sounds' : 'Mute sounds'}
          >
            <span>{muted ? '🔇' : '🔊'}</span>
          </button>
        </nav>
      </div>
    </header>
  )
}
