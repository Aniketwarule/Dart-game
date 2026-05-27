import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { formatDate } from '../utils/gameLogic'

export default function MatchHistory() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Fetch matches and players separately to avoid FK join ambiguity
      const { data: matchData } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false })

      if (!matchData) { setLoading(false); return }

      // Collect all winner player IDs
      const winnerIds = [...new Set(matchData.map(m => m.winner_player_id).filter(Boolean))]
      let winnerMap = {}
      if (winnerIds.length) {
        const { data: wPlayers } = await supabase
          .from('players')
          .select('id, name, player_code')
          .in('id', winnerIds)
        ;(wPlayers || []).forEach(p => { winnerMap[p.id] = p })
      }

      const data = matchData.map(m => ({
        ...m,
        winner: m.winner_player_id ? winnerMap[m.winner_player_id] : null,
      }))

      // For each match, get player count
      const enriched = await Promise.all((data || []).map(async m => {
        const { count } = await supabase
          .from('match_players')
          .select('id', { count: 'exact', head: true })
          .eq('match_id', m.id)
        return { ...m, playerCount: count ?? 0 }
      }))

      setMatches(enriched)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="loading-center"><div className="spinner" /><span>Loading…</span></div>
  }

  return (
    <>
      <div className="page-title">MATCH HISTORY</div>
      <div className="page-sub">All played matches · click to view full replay</div>

      {matches.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📜</div>
          <div className="empty-state-title">No Matches Yet</div>
          <div className="empty-state-sub">Matches will appear here once played.</div>
        </div>
      )}

      <div className="match-list">
        {matches.map(m => (
          <Link
            key={m.id}
            to={`/history/${m.id}`}
            className={`match-card ${m.status === 'aborted' ? 'aborted' : ''}`}
            id={`match-card-${m.id}`}
          >
            <div className="match-card-date">
              {new Date(m.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
            </div>

            <div className="match-card-info">
              <div className="match-card-title">
                {m.title || `Match #${m.id}`}
              </div>
              <div className="match-card-meta">
                {m.playerCount} players · {m.total_rounds} rounds · {m.throws_per_round} throws/round · {m.darts_per_throw} dart{m.darts_per_throw > 1 ? 's' : ''}/throw
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <span className={`status-badge ${m.status}`}>
                {m.status === 'active' && <><span className="live-dot" /> Live</>}
                {m.status === 'finished' && '✓ Finished'}
                {m.status === 'aborted' && '⚠ Aborted'}
              </span>
              {m.winner && (
                <div className="match-card-winner">
                  <div className="match-card-winner-name">🥇 {m.winner.name}</div>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
