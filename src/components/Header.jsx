import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAudio } from '../context/AudioContext'

export default function Header() {
  const { isAdmin } = useAuth()
  const { muted, setMuted } = useAudio()

  return (
    <>
      {/* ── Top header (desktop + mobile logo row) ── */}
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="header-logo">
            <span className="header-logo-icon">🎯</span>
            <span className="header-logo-text">DART PLATFORM</span>
          </Link>

          {/* Desktop nav — hidden on mobile via CSS */}
          <nav className="header-nav desktop-nav">
            <NavLink
              to="/"
              end
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
            >
              <span className="live-dot" />
              <span className="nav-label">Live</span>
            </NavLink>

            <NavLink
              to="/leaderboard"
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-label">Leaderboard</span>
            </NavLink>

            <NavLink
              to="/history"
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
            >
              <span className="nav-icon">📜</span>
              <span className="nav-label">History</span>
            </NavLink>

            <NavLink
              to="/admin"
              className={({ isActive }) => 'nav-link admin-link' + (isActive ? ' active' : '')}
            >
              <span className="nav-icon">{isAdmin ? '🔓' : '🔒'}</span>
              <span className="nav-label">Admin</span>
            </NavLink>

            <button
              onClick={() => setMuted(!muted)}
              className="nav-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px' }}
              title={muted ? 'Unmute sounds' : 'Mute sounds'}
            >
              <span className="nav-icon">{muted ? '🔇' : '🔊'}</span>
            </button>
          </nav>

          {/* Mobile top-right: sound toggle only */}
          <div className="mobile-header-right">
            <button
              onClick={() => setMuted(!muted)}
              className="nav-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px' }}
              title={muted ? 'Unmute sounds' : 'Mute sounds'}
              aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
            >
              <span>{muted ? '🔇' : '🔊'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <NavLink
          to="/"
          end
          className={({ isActive }) => 'mbn-tab' + (isActive ? ' active' : '')}
          aria-label="Live"
        >
          <span className="mbn-icon"><span className="live-dot" /></span>
          <span className="mbn-label">Live</span>
        </NavLink>

        <NavLink
          to="/leaderboard"
          className={({ isActive }) => 'mbn-tab' + (isActive ? ' active' : '')}
          aria-label="Leaderboard"
        >
          <span className="mbn-icon">📊</span>
          <span className="mbn-label">Leaders</span>
        </NavLink>

        <NavLink
          to="/history"
          className={({ isActive }) => 'mbn-tab' + (isActive ? ' active' : '')}
          aria-label="History"
        >
          <span className="mbn-icon">📜</span>
          <span className="mbn-label">History</span>
        </NavLink>

        <NavLink
          to="/admin"
          className={({ isActive }) => 'mbn-tab admin-tab' + (isActive ? ' active' : '')}
          aria-label="Admin"
        >
          <span className="mbn-icon">{isAdmin ? '🔓' : '🔒'}</span>
          <span className="mbn-label">Admin</span>
        </NavLink>
      </nav>
    </>
  )
}
