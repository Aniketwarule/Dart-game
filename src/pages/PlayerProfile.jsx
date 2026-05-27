import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { formatDate } from '../utils/gameLogic'

function stdDev(arr) {
  if (arr.length < 2) return '—'
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length
  const v = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length
  return parseFloat(Math.sqrt(v).toFixed(1))
}

export default function PlayerProfile() {
  const { playerId } = useParams()
  const [player, setPlayer] = useState(null)
  const [matches, setMatches] = useState([])
  const [throws, setThrows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: p } = await supabase.from('players').select('*').eq('id', playerId).single()
      if (!p) { setLoading(false); return }
      setPlayer(p)

      const { data: mps } = await supabase.from('match_players').select('match_id').eq('player_id', playerId)
      if (!mps || mps.length === 0) { setLoading(false); return }

      const matchIds = mps.map(m => m.match_id)

      const [{ data: mData }, { data: tData }] = await Promise.all([
        supabase.from('matches').select('*').in('id', matchIds).eq('status', 'finished').order('created_at', { ascending: false }),
        supabase.from('throws').select('*').eq('player_id', playerId).in('match_id', matchIds)
      ])

      setMatches(mData || [])
      setThrows(tData || [])
      setLoading(false)
    }
    load()
  }, [playerId])

  const stats = useMemo(() => {
    if (!player) return null
    
    const throwScores = throws.map(t => t.total_score)
    const dartScores = throws.flatMap(t => {
      const d = [t.dart1_score]
      if (t.dart2_score !== null) d.push(t.dart2_score)
      return d
    })

    const total = throwScores.reduce((s, v) => s + v, 0)
    const wins = matches.filter(m => m.winner_player_id === playerId).length
    const matchesPlayed = matches.length
    const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0
    const perfect10s = dartScores.filter(d => d === 10).length
    const avgPerThrow = throws.length ? parseFloat((total / throws.length).toFixed(1)) : 0
    
    // Best Round
    const roundGroups = {}
    for (const t of throws) {
      const key = `${t.match_id}-${t.round_num}`
      roundGroups[key] = (roundGroups[key] || 0) + t.total_score
    }
    const roundScores = Object.values(roundGroups)
    const bestRound = roundScores.length ? Math.max(...roundScores) : 0

    // Dart distribution buckets
    const buckets = [
      { label: '10 (Perfect)', min: 10, max: 10, accent: true,  count: 0 },
      { label: '8–9',          min: 8,  max: 9,  accent: false, count: 0 },
      { label: '5–7',          min: 5,  max: 7,  accent: false, count: 0 },
      { label: '2–4',          min: 2,  max: 4,  accent: false, count: 0 },
      { label: '1',            min: 1,  max: 1,  accent: false, count: 0 },
      { label: '0 (Miss)',     min: 0,  max: 0,  dim: true,     count: 0 },
    ]
    for (const d of dartScores) {
      for (const b of buckets) { if (d >= b.min && d <= b.max) { b.count++; break } }
    }

    return {
      total, wins, matchesPlayed, winRate, perfect10s, avgPerThrow, bestRound,
      consistency: stdDev(throwScores),
      buckets, totalDarts: dartScores.length
    }
  }, [player, matches, throws, playerId])

  if (loading) return <div className="loading-center"><div className="spinner" /></div>
  if (!player) return <div className="empty-state"><div className="empty-state-title">Player Not Found</div></div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Player Profile</div>
        <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '4rem', color: 'var(--text)', lineHeight: 1, letterSpacing: 2 }}>{player.name}</div>
        <div style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 700, marginTop: 4 }}>{player.player_code}</div>
      </div>

      {stats.matchesPlayed === 0 ? (
        <div className="empty-state"><div className="empty-state-title">No completed matches yet</div></div>
      ) : (
        <>
          <div className="an-section-title" style={{ marginBottom: 16 }}>LIFETIME STATS</div>
          <div className="an-summary-grid" style={{ marginBottom: 32 }}>
            <div className="an-stat-tile accent">
              <div className="an-stat-value">{stats.total}</div>
              <div className="an-stat-unit">pts</div>
              <div className="an-stat-label">Total Scored</div>
            </div>
            <div className="an-stat-tile">
              <div className="an-stat-value">{stats.matchesPlayed}</div>
              <div className="an-stat-unit">matches</div>
              <div className="an-stat-label">Played</div>
            </div>
            <div className="an-stat-tile">
              <div className="an-stat-value">{stats.winRate}%</div>
              <div className="an-stat-unit">{stats.wins}W {stats.matchesPlayed - stats.wins}L</div>
              <div className="an-stat-label">Win Rate</div>
            </div>
            <div className="an-stat-tile">
              <div className="an-stat-value">{stats.avgPerThrow}</div>
              <div className="an-stat-unit">avg</div>
              <div className="an-stat-label">Per Throw</div>
            </div>
            <div className="an-stat-tile accent">
              <div className="an-stat-value">{stats.bestRound}</div>
              <div className="an-stat-unit">pts</div>
              <div className="an-stat-label">Best Round</div>
            </div>
            <div className="an-stat-tile">
              <div className="an-stat-value">{stats.perfect10s}</div>
              <div className="an-stat-unit">darts</div>
              <div className="an-stat-label">Perfect 10s</div>
            </div>
          </div>

          <div className="an-section-title" style={{ marginBottom: 16 }}>DART DISTRIBUTION</div>
          <div className="an-dist-wrap" style={{ marginBottom: 32 }}>
            {stats.buckets.map(b => {
              const pct = stats.totalDarts ? Math.round((b.count / stats.totalDarts) * 100) : 0
              return (
                <div key={b.label} className="an-dist-row">
                  <div className="an-dist-label">{b.label}</div>
                  <div className="an-dist-bar-track">
                    <div
                      className={`an-dist-bar-fill ${b.accent ? 'accent' : b.dim ? 'dim' : ''}`}
                      style={{ width: pct ? `${pct}%` : '2px' }}
                    />
                  </div>
                  <div className="an-dist-count">{b.count}</div>
                  <div className="an-dist-pct">{pct}%</div>
                </div>
              )
            })}
          </div>

          <div className="an-section-title" style={{ marginBottom: 16 }}>RECENT MATCHES</div>
          <div className="match-list">
            {matches.slice(0, 5).map(m => {
              const isWinner = m.winner_player_id === player.id
              return (
                <Link key={m.id} to={`/history/${m.id}`} className="panel" style={{ display: 'flex', alignItems: 'center', gap: 16, textDecoration: 'none' }}>
                  <div style={{ fontSize: '2rem', width: 40, textAlign: 'center' }}>
                    {isWinner ? '🏆' : '🎯'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                      {m.title || `Match #${m.id}`}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                      {formatDate(m.created_at)} · {m.total_rounds} Rounds
                    </div>
                  </div>
                  <div className={`status-badge finished`} style={{ background: isWinner ? 'var(--gold)' : 'var(--surface2)', color: isWinner ? '#000' : 'var(--text2)' }}>
                    {isWinner ? 'WON' : 'LOST'}
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
