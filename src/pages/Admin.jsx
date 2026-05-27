import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import AdminLogin from '../components/AdminLogin'
import MatchView from './MatchView'
import { formatCode } from '../utils/gameLogic'

export default function Admin() {
  const { isAdmin, logout } = useAuth()

  const [tab, setTab] = useState('match')    // 'match' | 'players' | 'new'
  const [activeMatch, setActiveMatch] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  // New match form — store rounds/throws as strings so the input can be freely typed
  const [newMatchForm, setNewMatchForm] = useState({
    title: '',
    totalRounds: '5',
    throwsPerRound: '5',
    dartsPerThrow: 2,
  })
  const [selectedPlayers, setSelectedPlayers] = useState([])  // [{player_id, name, player_code}]
  const [playerSearch, setPlayerSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [matchError, setMatchError] = useState('')
  const [matchStarting, setMatchStarting] = useState(false)

  // Add player form
  const [newPlayerName, setNewPlayerName] = useState('')
  const [addingPlayer, setAddingPlayer] = useState(false)
  const [playerAddMsg, setPlayerAddMsg] = useState('')

  async function loadData() {
    // Use maybeSingle() instead of single() — returns null instead of error when no row found
    const [{ data: match }, { data: plist }] = await Promise.all([
      supabase.from('matches').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('players').select('*').order('player_code'),
    ])
    setActiveMatch(match || null)
    // Auto-switch to new match tab if no active match
    if (!match) setTab(prev => prev === 'match' ? 'new' : prev)
    setPlayers(plist || [])
    setLoading(false)
  }

  useEffect(() => { if (isAdmin) loadData() }, [isAdmin])

  // Player search
  useEffect(() => {
    if (!playerSearch.trim()) { setSearchResults([]); return }
    const q = playerSearch.toLowerCase()
    const results = players.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.player_code.includes(q)
    ).filter(p => !selectedPlayers.find(s => s.player_id === p.id))
    setSearchResults(results.slice(0, 8))
  }, [playerSearch, players, selectedPlayers])

  function selectPlayer(p) {
    setSelectedPlayers(prev => [...prev, { player_id: p.id, name: p.name, player_code: p.player_code }])
    setPlayerSearch('')
    setSearchResults([])
  }

  function removeSelected(pid) {
    setSelectedPlayers(prev => prev.filter(p => p.player_id !== pid))
  }

  async function startMatch() {
    setMatchError('')
    const totalRounds = parseInt(newMatchForm.totalRounds)
    const throwsPerRound = parseInt(newMatchForm.throwsPerRound)
    if (selectedPlayers.length < 2) { setMatchError('Select at least 2 players.'); return }
    if (!totalRounds || totalRounds < 1 || totalRounds > 50) { setMatchError('Rounds must be between 1 and 50.'); return }
    if (!throwsPerRound || throwsPerRound < 1 || throwsPerRound > 20) { setMatchError('Throws per round must be between 1 and 20.'); return }

    setMatchStarting(true)

    const { data: match, error: mErr } = await supabase.from('matches').insert({
      title: newMatchForm.title.trim() || null,
      total_rounds: totalRounds,
      throws_per_round: throwsPerRound,
      darts_per_throw: newMatchForm.dartsPerThrow,
      status: 'active',
    }).select().single()

    if (mErr || !match) { setMatchError('Failed to create match.'); setMatchStarting(false); return }

    // Add players
    const mpInserts = selectedPlayers.map((p, i) => ({
      match_id: match.id,
      player_id: p.player_id,
      turn_order: i + 1,
    }))
    await supabase.from('match_players').insert(mpInserts)

    setMatchStarting(false)
    setActiveMatch(match)
    setTab('match')
    await loadData()
  }

  async function addPlayer() {
    const name = newPlayerName.trim()
    if (!name) return
    setAddingPlayer(true)
    setPlayerAddMsg('')

    // Get next code
    const { data: last } = await supabase
      .from('players')
      .select('player_code')
      .order('player_code', { ascending: false })
      .limit(1)
      .single()

    const nextNum = last ? parseInt(last.player_code) + 1 : 1
    const player_code = formatCode(nextNum)

    const { data: created, error } = await supabase.from('players').insert({
      name, player_code
    }).select().single()

    if (error) {
      setPlayerAddMsg('Error: ' + error.message)
    } else {
      setPlayerAddMsg(`✓ ${created.name} added as ${player_code}`)
      setNewPlayerName('')
      await loadData()
    }
    setAddingPlayer(false)
  }

  if (!isAdmin) {
    return <AdminLogin onSuccess={loadData} />
  }

  if (loading) {
    return <div className="loading-center"><div className="spinner" /><span>Loading…</span></div>
  }

  return (
    <div className="admin-layout" style={{ maxWidth: activeMatch && tab === 'match' ? 1100 : 560 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div className="page-title">ADMIN</div>
          <div className="page-sub">Match management · Player registry</div>
        </div>
        <button className="btn btn-ghost" onClick={logout} id="admin-logout-btn">🔒 Logout</button>
      </div>

      <div className="tabs">
        {activeMatch && (
          <button id="tab-match" className={`tab-btn ${tab === 'match' ? 'active' : ''}`} onClick={() => setTab('match')}>
            🎯 Active Match
          </button>
        )}
        <button id="tab-new" className={`tab-btn ${tab === 'new' ? 'active' : ''}`} onClick={() => setTab('new')}>
          ➕ New Match
        </button>
        <button id="tab-players" className={`tab-btn ${tab === 'players' ? 'active' : ''}`} onClick={() => setTab('players')}>
          👤 Players ({players.length})
        </button>
      </div>

      {/* ── Active match ── */}
      {tab === 'match' && activeMatch && (
        <MatchView
          match={activeMatch}
          readOnly={false}
          onMatchFinished={() => { loadData(); setTab('new') }}
          onMatchAborted={() => { loadData(); setTab('new') }}
        />
      )}
      {tab === 'match' && !activeMatch && (
        <div className="empty-state">
          <div className="empty-state-icon">🎯</div>
          <div className="empty-state-title">No Active Match</div>
          <div className="empty-state-sub">Start a new match from the "New Match" tab.</div>
        </div>
      )}

      {/* ── New match ── */}
      {tab === 'new' && (
        <>
          {activeMatch && (
            <div className="panel" style={{ borderColor: 'rgba(255,92,26,0.3)', background: 'rgba(255,92,26,0.05)' }}>
              <div style={{ fontSize: 12, color: 'var(--orange)', marginBottom: 10 }}>
                ⚠ There is already an active match running.
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 12 }}
                  onClick={() => setTab('match')}
                >
                  → Go to Active Match
                </button>
                <button
                  className="btn btn-danger"
                  style={{ fontSize: 12 }}
                  onClick={async () => {
                    if (!window.confirm('Force-finish this match as aborted so you can start a new one?')) return
                    await supabase.from('matches').update({ status: 'aborted' }).eq('id', activeMatch.id)
                    await loadData()
                  }}
                >
                  ⚠ Abort old match &amp; start fresh
                </button>
              </div>
            </div>
          )}

          <div className="panel">
            <div className="panel-label">Match Settings</div>

            <div className="field">
              <label className="field-label">Title (optional)</label>
              <input
                id="match-title-input"
                className="field-input"
                placeholder="e.g. Friday Night Darts"
                value={newMatchForm.title}
                onChange={e => setNewMatchForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="field">
              <label className="field-label">Number of Rounds</label>
              <input
                id="rounds-input"
                type="number" min={1} max={50}
                className="field-input"
                style={{ width: 120 }}
                value={newMatchForm.totalRounds}
                onChange={e => setNewMatchForm(f => ({ ...f, totalRounds: e.target.value }))}
                onBlur={e => {
                  const v = parseInt(e.target.value)
                  if (!v || v < 1) setNewMatchForm(f => ({ ...f, totalRounds: '1' }))
                  else if (v > 50) setNewMatchForm(f => ({ ...f, totalRounds: '50' }))
                }}
              />
            </div>

            <div className="field">
              <label className="field-label">Throws per Round (per player)</label>
              <input
                id="throws-per-round-input"
                type="number" min={1} max={20}
                className="field-input"
                style={{ width: 120 }}
                value={newMatchForm.throwsPerRound}
                onChange={e => setNewMatchForm(f => ({ ...f, throwsPerRound: e.target.value }))}
                onBlur={e => {
                  const v = parseInt(e.target.value)
                  if (!v || v < 1) setNewMatchForm(f => ({ ...f, throwsPerRound: '1' }))
                  else if (v > 20) setNewMatchForm(f => ({ ...f, throwsPerRound: '20' }))
                }}
              />
            </div>

            <div className="field">
              <label className="field-label">Darts per Throw</label>
              <div className="toggle-group">
                <button
                  id="darts-1-btn"
                  className={`toggle-btn ${newMatchForm.dartsPerThrow === 1 ? 'active' : ''}`}
                  onClick={() => setNewMatchForm(f => ({ ...f, dartsPerThrow: 1 }))}
                >
                  1 Dart (max 10/throw)
                </button>
                <button
                  id="darts-2-btn"
                  className={`toggle-btn ${newMatchForm.dartsPerThrow === 2 ? 'active' : ''}`}
                  onClick={() => setNewMatchForm(f => ({ ...f, dartsPerThrow: 2 }))}
                >
                  2 Darts (max 20/throw)
                </button>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-label">Select Players</div>

            <div className="player-search-wrap">
              <input
                id="player-search-input"
                className="field-input"
                placeholder="Search by name or ID (e.g. 001)…"
                value={playerSearch}
                onChange={e => setPlayerSearch(e.target.value)}
                autoComplete="off"
              />
              {searchResults.length > 0 && (
                <div className="player-search-results">
                  {searchResults.map(p => (
                    <div key={p.id} className="player-search-item" onClick={() => selectPlayer(p)}>
                      <span className="player-search-code">{p.player_code}</span>
                      <span>{p.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedPlayers.length > 0 && (
              <>
                <div className="order-hint">Playing order: left → right (drag to reorder soon)</div>
                <div className="selected-players">
                  {selectedPlayers.map((p, i) => (
                    <div key={p.player_id} className="player-chip">
                      <span style={{ fontSize: 10, color: 'var(--text3)' }}>{i + 1}.</span>
                      <span className="player-chip-code">{p.player_code}</span>
                      <span>{p.name}</span>
                      <button className="player-chip-remove" onClick={() => removeSelected(p.player_id)}>✕</button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {selectedPlayers.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '20px 0' }}>
                Search and select at least 2 players above
              </div>
            )}
          </div>

          {matchError && (
            <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12, fontWeight: 600 }}>{matchError}</div>
          )}

          <button
            id="start-match-btn"
            className="btn btn-primary btn-full btn-lg"
            onClick={startMatch}
            disabled={matchStarting}
          >
            {matchStarting ? 'Starting…' : '🎯 START MATCH'}
          </button>
        </>
      )}

      {/* ── Player registry ── */}
      {tab === 'players' && (
        <>
          <div className="panel">
            <div className="panel-label">Add New Player</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                id="new-player-name-input"
                className="field-input"
                placeholder="Player name"
                value={newPlayerName}
                onChange={e => setNewPlayerName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPlayer()}
                style={{ flex: 1 }}
              />
              <button
                id="add-player-btn"
                className="btn btn-primary"
                onClick={addPlayer}
                disabled={addingPlayer || !newPlayerName.trim()}
              >
                Add
              </button>
            </div>
            {playerAddMsg && (
              <div style={{ marginTop: 10, fontSize: 12, color: playerAddMsg.startsWith('✓') ? 'var(--green)' : 'var(--red)' }}>
                {playerAddMsg}
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-label">All Players ({players.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {players.map(p => (
                <div key={p.id} className="lb-row" style={{ padding: '12px 16px' }}>
                  <div className="player-search-code" style={{ fontSize: '1.4rem', minWidth: 48 }}>{p.player_code}</div>
                  <div className="lb-info">
                    <div className="lb-player-name">{p.name}</div>
                    <div className="lb-avg">Added {new Date(p.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
              {players.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text3)', padding: '20px 0', fontSize: 12 }}>
                  No players yet. Add one above.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
