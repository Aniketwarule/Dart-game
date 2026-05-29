import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../supabase'
import { Link } from 'react-router-dom'

const CATEGORIES = [
  // ─── Scoring ───
  { group: '🎯 Scoring',     id: 'most_points',        label: 'Most Points',          unit: 'pts',      desc: 'Highest all-time total score across all finished matches' },
  { group: '🎯 Scoring',     id: 'best_avg',            label: 'Best Avg / Throw',     unit: 'avg',      desc: 'Highest average score per throw (min 1 match)' },
  { group: '🎯 Scoring',     id: 'best_dart_avg',       label: 'Best Avg / Dart',      unit: 'avg',      desc: 'Highest average score per individual dart' },
  { group: '🎯 Scoring',     id: 'best_round',          label: 'Best Round Ever',      unit: 'pts',      desc: 'Highest score in a single round across all matches' },
  { group: '🎯 Scoring',     id: 'worst_avg',           label: 'Lowest Avg / Throw',   unit: 'avg',      desc: 'Lowest average score per throw (hall of shame)' },
  // ─── Perfection ───
  { group: '💎 Perfection',  id: 'perfect_darts',       label: 'Perfect Darts (10s)',  unit: 'darts',    desc: 'Total number of 10-point darts ever thrown' },
  { group: '💎 Perfection',  id: 'perfect_throws',      label: 'Perfect Throws',       unit: 'throws',   desc: 'Times both darts scored 10 in a single throw (20 pts)' },
  { group: '💎 Perfection',  id: 'perfect_rounds',      label: 'Perfect Rounds',       unit: 'rounds',   desc: 'Rounds where every single throw was a perfect score' },
  { group: '💎 Perfection',  id: 'near_perfect_darts',  label: 'Near-Perfect (9s)',    unit: 'darts',    desc: 'Total number of 9-point darts thrown' },
  // ─── Match Record ───
  { group: '🏆 Match Record',id: 'most_wins',           label: 'Most Wins',            unit: 'wins',     desc: 'Total matches won' },
  { group: '🏆 Match Record',id: 'most_matches',        label: 'Most Matches',         unit: 'matches',  desc: 'Total matches played' },
  { group: '🏆 Match Record',id: 'best_win_rate',       label: 'Best Win Rate',        unit: '%',        desc: 'Win percentage (min 2 matches played)' },
  { group: '🏆 Match Record',id: 'most_losses',         label: 'Most Losses',          unit: 'L',        desc: 'Total matches lost (didn\'t win)' },
  // ─── Volume ───
  { group: '📊 Volume',      id: 'most_throws',         label: 'Most Throws',          unit: 'throws',   desc: 'Total throws taken across all matches' },
  { group: '📊 Volume',      id: 'most_darts',          label: 'Most Darts',           unit: 'darts',    desc: 'Total individual darts thrown' },
  { group: '📊 Volume',      id: 'most_rounds',         label: 'Most Rounds Played',   unit: 'rounds',   desc: 'Total rounds participated in' },
  // ─── Streaks / Consistency ───
  { group: '🔥 Consistency', id: 'most_consistent',     label: 'Most Consistent',      unit: 'σ',        desc: 'Lowest std deviation of throw scores (min 5 throws)' },
  { group: '🔥 Consistency', id: 'highest_min_throw',   label: 'Highest Floor',        unit: 'pts',      desc: 'Highest worst single throw score ever (min 5 throws)' },
  { group: '🔥 Consistency', id: 'zero_throws',         label: 'Most Misses (0s)',     unit: 'misses',   desc: 'Total number of 0-point throws (misses)' },
]

const GROUPS = [...new Set(CATEGORIES.map(c => c.group))]

function stdDev(arr) {
  if (arr.length < 2) return 0
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length
  const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length
  return Math.sqrt(variance)
}

export default function Leaderboard() {
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeGroup, setActiveGroup] = useState(GROUPS[0])
  const [activeCat, setActiveCat] = useState(CATEGORIES[0].id)
  const [timeFilter, setTimeFilter] = useState('lifetime') // 'lifetime' | 'month' | 'week'

  useEffect(() => {
    async function load() {
      setLoading(true)
      
      let matchQuery = supabase.from('matches').select('*').eq('status', 'finished')
      const now = new Date()
      if (timeFilter === 'month') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        matchQuery = matchQuery.gte('created_at', lastMonth.toISOString())
      } else if (timeFilter === 'week') {
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        matchQuery = matchQuery.gte('created_at', lastWeek.toISOString())
      }

      const [{ data: matches }, { data: players }, { data: allThrows }, { data: matchPlayers }] = await Promise.all([
        matchQuery,
        supabase.from('players').select('*').order('player_code'),
        supabase.from('throws').select('*'),
        supabase.from('match_players').select('*'),
      ])
      if (!players) { setLoading(false); return }

      const finishedMatchIds = new Set((matches || []).map(m => m.id))

      const playerStats = {}
      for (const p of players) {
        const myMatchIds = (matchPlayers || [])
          .filter(mp => mp.player_id === p.id && finishedMatchIds.has(mp.match_id))
          .map(mp => mp.match_id)

        const myThrows = (allThrows || []).filter(t =>
          t.player_id === p.id && finishedMatchIds.has(t.match_id)
        )

        const dartScores = myThrows.flatMap(t => {
          const d = [t.dart1_score]
          if (t.dart2_score !== null) d.push(t.dart2_score)
          return d
        })
        const throwScores = myThrows.map(t => t.total_score)

        const total = throwScores.reduce((s, v) => s + v, 0)
        const throwCount = myThrows.length
        const totalDarts = dartScores.length
        const matchesPlayed = myMatchIds.length
        const wins = (matches || []).filter(m => m.winner_player_id === p.id).length
        const losses = matchesPlayed - wins
        const winRate = matchesPlayed >= 2 ? parseFloat(((wins / matchesPlayed) * 100).toFixed(1)) : null
        const avgPerThrow = throwCount ? parseFloat((total / throwCount).toFixed(2)) : 0
        const avgPerDart = totalDarts ? parseFloat((total / totalDarts).toFixed(2)) : 0
        const perfectDarts = dartScores.filter(d => d === 10).length
        const nearPerfectDarts = dartScores.filter(d => d === 9).length
        const perfectThrows = myThrows.filter(t => t.dart1_score === 10 && t.dart2_score === 10).length
        const zeroThrows = myThrows.filter(t => t.total_score === 0).length

        // Best round
        const roundGroups = {}
        for (const t of myThrows) {
          const key = `${t.match_id}-${t.round_num}`
          roundGroups[key] = (roundGroups[key] || 0) + t.total_score
        }
        const roundScores = Object.values(roundGroups)
        const bestRound = roundScores.length ? Math.max(...roundScores) : 0
        const totalRounds = roundScores.length

        // Perfect rounds: need to know throws_per_round per match; approximate using throw count vs rounds
        // A round is "perfect" if every throw in it scored max possible
        // We'll count rounds where every throw was ≥ match darts_per_throw * 10 - 0
        // Simpler: rounds where score equals (throwsInRound * maxPerThrow)
        // We can compute this per match
        let perfectRounds = 0
        for (const matchId of myMatchIds) {
          const matchObj = (matches || []).find(m => m.id === matchId)
          if (!matchObj) continue
          const maxPerThrow = matchObj.darts_per_throw * 10
          const matchThrows = myThrows.filter(t => t.match_id === matchId)
          const matchRoundGroups = {}
          const matchRoundCounts = {}
          for (const t of matchThrows) {
            const key = t.round_num
            matchRoundGroups[key] = (matchRoundGroups[key] || 0) + t.total_score
            matchRoundCounts[key] = (matchRoundCounts[key] || 0) + 1
          }
          for (const [rn, score] of Object.entries(matchRoundGroups)) {
            const throwsInRound = matchRoundCounts[rn]
            if (score === throwsInRound * maxPerThrow && score > 0) perfectRounds++
          }
        }

        const consistency = throwCount >= 5 ? parseFloat(stdDev(throwScores).toFixed(2)) : null
        const minThrow = throwCount >= 5 ? Math.min(...throwScores) : null

        playerStats[p.id] = {
          player_id: p.id, name: p.name, player_code: p.player_code,
          total, throwCount, totalDarts, matchesPlayed, wins, losses, winRate,
          avgPerThrow, avgPerDart,
          perfectDarts, nearPerfectDarts, perfectThrows, perfectRounds, zeroThrows,
          bestRound, totalRounds,
          consistency, minThrow,
        }
      }
      setStats(playerStats)
      setLoading(false)
    }
    load()
  }, [timeFilter])

  const allPlayers = useMemo(() => Object.values(stats), [stats])

  function getRanked(catId) {
    const s = [...allPlayers]
    switch (catId) {
      case 'most_points':       return s.sort((a,b) => b.total - a.total)
      case 'best_avg':          return s.filter(p => p.throwCount > 0).sort((a,b) => b.avgPerThrow - a.avgPerThrow)
      case 'best_dart_avg':     return s.filter(p => p.totalDarts > 0).sort((a,b) => b.avgPerDart - a.avgPerDart)
      case 'best_round':        return s.sort((a,b) => b.bestRound - a.bestRound)
      case 'worst_avg':         return s.filter(p => p.throwCount > 0).sort((a,b) => a.avgPerThrow - b.avgPerThrow)
      case 'perfect_darts':     return s.sort((a,b) => b.perfectDarts - a.perfectDarts)
      case 'perfect_throws':    return s.sort((a,b) => b.perfectThrows - a.perfectThrows)
      case 'perfect_rounds':    return s.sort((a,b) => b.perfectRounds - a.perfectRounds)
      case 'near_perfect_darts':return s.sort((a,b) => b.nearPerfectDarts - a.nearPerfectDarts)
      case 'most_wins':         return s.filter(p => p.matchesPlayed > 0).sort((a,b) => b.wins - a.wins)
      case 'most_matches':      return s.filter(p => p.matchesPlayed > 0).sort((a,b) => b.matchesPlayed - a.matchesPlayed)
      case 'best_win_rate':     return s.filter(p => p.winRate !== null).sort((a,b) => b.winRate - a.winRate)
      case 'most_losses':       return s.filter(p => p.matchesPlayed > 0).sort((a,b) => b.losses - a.losses)
      case 'most_throws':       return s.sort((a,b) => b.throwCount - a.throwCount)
      case 'most_darts':        return s.sort((a,b) => b.totalDarts - a.totalDarts)
      case 'most_rounds':       return s.sort((a,b) => b.totalRounds - a.totalRounds)
      case 'most_consistent':   return s.filter(p => p.consistency !== null).sort((a,b) => a.consistency - b.consistency)
      case 'highest_min_throw': return s.filter(p => p.minThrow !== null).sort((a,b) => b.minThrow - a.minThrow)
      case 'zero_throws':       return s.sort((a,b) => b.zeroThrows - a.zeroThrows)
      default: return s
    }
  }

  function getValue(p, catId) {
    switch (catId) {
      case 'most_points':        return p.total
      case 'best_avg':           return p.avgPerThrow.toFixed(1)
      case 'best_dart_avg':      return p.avgPerDart.toFixed(1)
      case 'best_round':         return p.bestRound
      case 'worst_avg':          return p.avgPerThrow.toFixed(1)
      case 'perfect_darts':      return p.perfectDarts
      case 'perfect_throws':     return p.perfectThrows
      case 'perfect_rounds':     return p.perfectRounds
      case 'near_perfect_darts': return p.nearPerfectDarts
      case 'most_wins':          return p.wins
      case 'most_matches':       return p.matchesPlayed
      case 'best_win_rate':      return p.winRate !== null ? `${p.winRate}` : '—'
      case 'most_losses':        return p.losses
      case 'most_throws':        return p.throwCount
      case 'most_darts':         return p.totalDarts
      case 'most_rounds':        return p.totalRounds
      case 'most_consistent':    return p.consistency !== null ? p.consistency : '—'
      case 'highest_min_throw':  return p.minThrow !== null ? p.minThrow : '—'
      case 'zero_throws':        return p.zeroThrows
      default: return '—'
    }
  }

  function getSubline(p, catId) {
    const parts = []
    if (p.matchesPlayed > 0) parts.push(`${p.matchesPlayed} match${p.matchesPlayed !== 1 ? 'es' : ''}`)
    if (p.wins > 0) parts.push(`${p.wins}W`)
    if (p.throwCount > 0) parts.push(`${p.total} pts`)
    if (p.avgPerThrow > 0) parts.push(`avg ${p.avgPerThrow}/throw`)
    return parts.slice(0, 3).join(' · ')
  }

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Loading…</span></div>

  const groupCats = CATEGORIES.filter(c => c.group === activeGroup)
  const cfg = CATEGORIES.find(c => c.id === activeCat)
  const ranked = getRanked(activeCat)

  return (
    <>
      <div className="lb-top-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div className="page-title">LEADERBOARD</div>
          <div className="page-sub">
            {timeFilter === 'lifetime' ? 'All-time stats' : timeFilter === 'month' ? 'Past 30 days' : 'Past 7 days'}
            {' '}across finished matches · {allPlayers.filter(p => p.matchesPlayed > 0).length} players
          </div>
        </div>
        
        {/* Time Filter Toggle */}
        <div className="toggle-group lb-time-toggle" style={{ width: 280, flexShrink: 0 }}>
          <button className={`toggle-btn ${timeFilter === 'lifetime' ? 'active' : ''}`} onClick={() => setTimeFilter('lifetime')}>Lifetime</button>
          <button className={`toggle-btn ${timeFilter === 'month' ? 'active' : ''}`} onClick={() => setTimeFilter('month')}>Month</button>
          <button className={`toggle-btn ${timeFilter === 'week' ? 'active' : ''}`} onClick={() => setTimeFilter('week')}>Week</button>
        </div>
      </div>

      {allPlayers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-title">No Stats Yet</div>
          <div className="empty-state-sub">Stats appear after matches are finished.</div>
        </div>
      ) : (
        <>
          {/* ── Group pill scroller ── */}
          <div className="lb-group-scroller">
            {GROUPS.map(g => (
              <button
                key={g}
                className={`lb-group-pill ${activeGroup === g ? 'active' : ''}`}
                onClick={() => {
                  setActiveGroup(g)
                  const firstInGroup = CATEGORIES.find(c => c.group === g)
                  if (firstInGroup) setActiveCat(firstInGroup.id)
                }}
              >
                {g}
              </button>
            ))}
          </div>

          {/* ── Category row ── */}
          <div className="lb-cat-row">
            {groupCats.map(cat => (
              <button
                key={cat.id}
                id={`lb-tab-${cat.id}`}
                className={`lb-cat-btn ${activeCat === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCat(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* ── Description ── */}
          {cfg && (
            <div className="lb-desc">
              <span className="lb-desc-icon">ℹ</span>
              {cfg.desc}
            </div>
          )}

          {/* ── Rankings ── */}
          <div className="lb-list">
            {ranked.slice(0, 25).map((p, rank) => {
              const rankEmoji = ['🥇', '🥈', '🥉']
              const rankClass = rank === 0 ? 'r1' : rank === 1 ? 'r2' : rank === 2 ? 'r3' : ''
              const val = getValue(p, activeCat)
              return (
                <div key={p.player_id} className={`lb-row ${rank === 0 ? 'rank-1' : ''}`}>
                  <div className={`lb-rank ${rankClass}`}>
                    {rank < 3 ? rankEmoji[rank] : rank + 1}
                  </div>
                  <div className="lb-info">
                    <Link to={`/player/${p.player_id}`} className="lb-player-name" style={{ textDecoration: 'none', color: 'inherit' }}>{p.name}</Link>
                    <div className="lb-player-id">{p.player_code}</div>
                    <div className="lb-avg">{getSubline(p, activeCat)}</div>
                  </div>
                  <div className="lb-total">
                    <div className="lb-total-num">{val}</div>
                    <div className="lb-total-label">{cfg?.unit}</div>
                  </div>
                </div>
              )
            })}
            {ranked.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 32, fontSize: 12 }}>
                No data for this category yet.
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
