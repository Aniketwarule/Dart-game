import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { computeStats, sortStandings, formatDate } from '../utils/gameLogic'
import LiveLeaderboard from '../components/LiveLeaderboard'
import MatchAnalytics from '../components/MatchAnalytics'

export default function MatchDetail() {
  const { matchId } = useParams()
  const [match, setMatch] = useState(null)
  const [players, setPlayers] = useState([])
  const [throws, setThrows] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')  // 'overview' | 'analytics' | 'throws'

  useEffect(() => {
    async function load() {
      const [{ data: m }, { data: mps }, { data: trows }] = await Promise.all([
        supabase.from('matches').select('*').eq('id', matchId).single(),
        supabase.from('match_players').select('player_id, turn_order, players(name, player_code)').eq('match_id', matchId).order('turn_order'),
        supabase.from('throws').select('*').eq('match_id', matchId).order('created_at'),
      ])
      setMatch(m)
      setPlayers((mps || []).map(mp => ({
        player_id: mp.player_id, name: mp.players.name,
        player_code: mp.players.player_code, turn_order: mp.turn_order
      })))
      setThrows(trows || [])
      setLoading(false)
    }
    load()
  }, [matchId])

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Loading…</span></div>
  if (!match) return <div className="empty-state"><div className="empty-state-title">Match not found</div></div>

  const stats = computeStats(players, throws, match)
  const sorted = sortStandings(stats)
  const rounds = Array.from({ length: match.total_rounds }, (_, i) => i + 1)

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <Link to="/history" className="btn btn-ghost" style={{ marginBottom: 16, display: 'inline-flex' }}>
          ← Back to History
        </Link>
        <div className="page-title">{match.title || `Match #${match.id}`}</div>
        <div className="page-sub">
          {formatDate(match.created_at)} · {players.length} players · {match.total_rounds} rounds · {match.throws_per_round} throws/round · {match.darts_per_throw} dart{match.darts_per_throw > 1 ? 's' : ''}/throw
          &nbsp;·&nbsp;
          <span className={`status-badge ${match.status}`} style={{ verticalAlign: 'middle' }}>
            {match.status}
          </span>
        </div>
      </div>

      {/* Winner banner */}
      {match.status === 'finished' && sorted[0] && (
        <div className="winner-stage" style={{ marginBottom: 24 }}>
          <div className="winner-icon">🏆</div>
          <div className="winner-eyebrow">Winner</div>
          <Link to={`/player/${sorted[0].player_id}`} className="winner-name" style={{ textDecoration: 'none' }}>{sorted[0].name}</Link>
          <div className="winner-score-line">Total: <strong>{sorted[0].total} pts</strong></div>
        </div>
      )}

      {/* Tab switcher */}
      <div className="match-view-tabs" style={{ marginBottom: 20 }}>
        <button className={`match-view-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')} id="md-tab-overview">🏆 Overview</button>
        <button className={`match-view-tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')} id="md-tab-analytics">📊 Analytics</button>
        <button className={`match-view-tab ${activeTab === 'throws' ? 'active' : ''}`} onClick={() => setActiveTab('throws')} id="md-tab-throws">📝 Throw Log</button>
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <>
      <div style={{ marginTop: 28 }}>
        <div className="final-standings-title">ROUND BY ROUND</div>
        <div className="panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', color: 'var(--text3)', padding: '6px 12px 10px 0', fontWeight: 700, letterSpacing: 1, fontSize: 10, textTransform: 'uppercase' }}>Player</th>
                {rounds.map(r => (
                  <th key={r} style={{ color: 'var(--text3)', padding: '6px 8px 10px', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', textAlign: 'center', letterSpacing: 1 }}>R{r}</th>
                ))}
                <th style={{ color: 'var(--accent)', padding: '6px 0 10px 8px', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', textAlign: 'right', letterSpacing: 1 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, rank) => (
                <tr key={s.player_id} style={{ borderTop: '1px solid var(--border2)' }}>
                  <td style={{ padding: '10px 12px 10px 0' }}>
                    <Link to={`/player/${s.player_id}`} style={{ fontWeight: 700, color: rank === 0 ? 'var(--gold)' : 'var(--text)', textDecoration: 'none' }}>{s.name}</Link>
                    <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text3)' }}>{s.player_code}</span>
                  </td>
                  {rounds.map(r => {
                    const sc = s.roundScores[r]
                    const isBest = sc !== undefined && sc === s.bestRound && s.roundScoreArr.length > 1
                    return (
                      <td key={r} style={{ textAlign: 'center', padding: '10px 8px', color: sc === undefined ? 'var(--text3)' : isBest ? 'var(--green)' : 'var(--text2)', fontWeight: isBest ? 700 : 500 }}>
                        {sc ?? '—'}
                      </td>
                    )
                  })}
                  <td style={{ textAlign: 'right', padding: '10px 0 10px 8px', fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.3rem', color: rank === 0 ? 'var(--gold)' : 'var(--accent)', letterSpacing: 1 }}>
                    {s.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-throw breakdown */}
      <div style={{ marginTop: 20 }}>
        <div className="final-standings-title">THROW DETAILS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sorted.map(s => {
            const myThrows = throws.filter(t => t.player_id === s.player_id)
            return (
              <div key={s.player_id} className="panel panel-sm">
                <div className="panel-label">
                  <Link to={`/player/${s.player_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>{s.name}</Link>
                  <span style={{ color: 'var(--text3)', fontWeight: 400, marginLeft: 6 }}>· {s.total} pts · avg {s.avg}/throw</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {myThrows.map((t, i) => (
                    <div key={t.id} style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      fontSize: 11,
                      fontWeight: 700,
                      color: t.total_score >= 18 ? 'var(--green)' : t.total_score >= 10 ? 'var(--text)' : 'var(--text3)',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 1 }}>R{t.round_num}T{t.throw_num}</div>
                      {t.total_score}
                      {match.darts_per_throw === 2 && (
                        <div style={{ fontSize: 8, color: 'var(--text3)' }}>{t.dart1_score}+{t.dart2_score ?? 0}</div>
                      )}
                    </div>
                  ))}
                  {myThrows.length === 0 && <span style={{ color: 'var(--text3)', fontSize: 11 }}>No throws recorded</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
        </>
      )}

      {/* Analytics tab */}
      {activeTab === 'analytics' && (
        <MatchAnalytics match={match} players={players} throws={throws} />
      )}

      {/* Throws log tab (old view) */}
      {activeTab === 'throws' && (
        <div style={{ marginTop: 20 }}>
          <div className="final-standings-title">RAW THROW LOG</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text3)' }}>
                <th style={{ padding: '8px 4px' }}>Time</th>
                <th style={{ padding: '8px 4px' }}>Player</th>
                <th style={{ padding: '8px 4px' }}>Round</th>
                <th style={{ padding: '8px 4px' }}>Darts</th>
                <th style={{ padding: '8px 4px', textAlign: 'right' }}>Score</th>
              </tr>
            </thead>
            <tbody>
              {throws.map(t => {
                const p = players.find(x => x.player_id === t.player_id)
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border2)' }}>
                    <td style={{ padding: '8px 4px', color: 'var(--text3)' }}>{new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ padding: '8px 4px' }}>{p?.name}</td>
                    <td style={{ padding: '8px 4px' }}>R{t.round_num} T{t.throw_num}</td>
                    <td style={{ padding: '8px 4px', color: 'var(--text2)' }}>
                      {t.dart1_score} {t.dart2_score !== null ? `+ ${t.dart2_score}` : ''}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>{t.total_score}</td>
                  </tr>
                )
              })}
              {throws.length === 0 && <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: 'var(--text3)' }}>No throws recorded</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
