import { useMemo } from 'react'

/**
 * MatchAnalytics — per-match stat breakdown
 * Props: match, players [{player_id, name, player_code}], throws []
 */
export default function MatchAnalytics({ match, players, throws }) {
  const stats = useMemo(() => computeMatchStats(match, players, throws), [match, players, throws])

  if (!players.length) return (
    <div className="empty-state"><div className="empty-state-title">No data yet</div></div>
  )

  const { playerStats, roundLeaders, dartDist, matchTotals } = stats

  const sorted = [...playerStats].sort((a, b) => b.total - a.total)
  const winner = sorted[0]
  const rounds = Array.from({ length: match.total_rounds }, (_, i) => i + 1)

  return (
    <div className="analytics-wrap">

      {/* ── Match Summary ── */}
      <div className="an-section-title">MATCH SUMMARY</div>
      <div className="an-summary-grid">
        <StatTile label="Total Pts Scored" value={matchTotals.totalScore} unit="pts" accent />
        <StatTile label="Throws Recorded" value={matchTotals.totalThrows} unit="throws" />
        <StatTile label="Avg / Throw" value={matchTotals.avgPerThrow} unit="avg" />
        <StatTile label="Total Darts" value={matchTotals.totalDarts} unit="darts" />
        <StatTile label="Avg / Dart" value={matchTotals.avgPerDart} unit="avg" />
        <StatTile label="Perfect Darts (10s)" value={matchTotals.perfect10s} unit="darts" accent />
        <StatTile label="Perfect Throws" value={matchTotals.perfectThrows} unit="throws" accent />
        <StatTile label="Misses (0pts)" value={matchTotals.zeros} unit="zeroes" dim />
      </div>

      {/* ── Records ── */}
      <div className="an-section-title">MATCH RECORDS</div>
      <div className="an-records-grid">
        {matchTotals.bestThrow && (
          <RecordCard
            icon="🎯"
            label="Best Single Throw"
            value={matchTotals.bestThrow.total_score}
            unit="pts"
            sub={`by ${players.find(p => p.player_id === matchTotals.bestThrow.player_id)?.name ?? '?'} · R${matchTotals.bestThrow.round_num}`}
            color="accent"
          />
        )}
        {matchTotals.bestRoundEntry && (
          <RecordCard
            icon="🔥"
            label="Best Round"
            value={matchTotals.bestRoundEntry.score}
            unit="pts"
            sub={`by ${matchTotals.bestRoundEntry.playerName} · Round ${matchTotals.bestRoundEntry.round}`}
            color="green"
          />
        )}
        {matchTotals.worstThrow && (
          <RecordCard
            icon="😅"
            label="Lowest Throw"
            value={matchTotals.worstThrow.total_score}
            unit="pts"
            sub={`by ${players.find(p => p.player_id === matchTotals.worstThrow.player_id)?.name ?? '?'}`}
            color="dim"
          />
        )}
        {matchTotals.mostConsistent && (
          <RecordCard
            icon="📐"
            label="Most Consistent"
            value={matchTotals.mostConsistent.name}
            unit=""
            sub={`σ=${matchTotals.mostConsistent.stdDev} · avg ${matchTotals.mostConsistent.avg}`}
            color="gold"
          />
        )}
        {matchTotals.highestSingleDart && (
          <RecordCard
            icon="💎"
            label="Most Perfect Darts"
            value={matchTotals.highestSingleDart.count}
            unit="× 10pts"
            sub={`by ${matchTotals.highestSingleDart.name}`}
            color="accent"
          />
        )}
        {matchTotals.biggestWinMargin !== null && (
          <RecordCard
            icon="👑"
            label="Win Margin"
            value={matchTotals.biggestWinMargin}
            unit="pts"
            sub={`${winner?.name ?? '?'} ahead of 2nd`}
            color="gold"
          />
        )}
      </div>

      {/* ── Player Comparison ── */}
      <div className="an-section-title">PLAYER BREAKDOWN</div>
      <div className="an-player-grid">
        {sorted.map((ps, rank) => {
          const rankEmoji = ['🥇','🥈','🥉']
          const barPct = winner?.total ? Math.round((ps.total / winner.total) * 100) : 0
          return (
            <div key={ps.player_id} className="an-player-card">
              <div className="an-pc-top">
                <span className="an-pc-rank">{rank < 3 ? rankEmoji[rank] : `#${rank+1}`}</span>
                <div>
                  <div className="an-pc-name">{ps.name}</div>
                  <div className="an-pc-id">{ps.player_code}</div>
                </div>
                <div className="an-pc-total">
                  <div className="an-pc-total-num">{ps.total}</div>
                  <div className="an-pc-total-label">pts</div>
                </div>
              </div>

              {/* Score bar */}
              <div className="an-bar-track">
                <div className="an-bar-fill" style={{ width: `${barPct}%`, opacity: rank === 0 ? 1 : 0.55 }} />
              </div>

              {/* Mini stats row */}
              <div className="an-pc-stats">
                <MiniStat label="Throws" value={ps.throwCount} />
                <MiniStat label="Avg/throw" value={ps.avgPerThrow} />
                <MiniStat label="Avg/dart" value={ps.avgPerDart} />
                <MiniStat label="Best Round" value={ps.bestRound} />
                <MiniStat label="10s 🎯" value={ps.perfect10s} />
                <MiniStat label="20pt Throws" value={ps.perfectThrows} />
                <MiniStat label="Misses" value={ps.zeros} dim={ps.zeros > 0} />
                <MiniStat label="Std Dev σ" value={ps.stdDev} />
              </div>

              {/* Round scores */}
              {match.total_rounds > 1 && (
                <div className="an-pc-rounds">
                  {rounds.map(r => {
                    const sc = ps.roundScores[r]
                    const isBest = sc !== undefined && sc === ps.bestRound && Object.values(ps.roundScores).length > 1
                    return (
                      <div key={r} className={`an-round-chip ${sc !== undefined ? (isBest ? 'best' : 'done') : 'pending'}`}>
                        <span className="an-round-chip-label">R{r}</span>
                        <span className="an-round-chip-val">{sc ?? '—'}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Dart distribution ── */}
      <div className="an-section-title">DART DISTRIBUTION</div>
      <div className="an-dist-wrap">
        {dartDist.buckets.map(b => {
          const pct = dartDist.total ? Math.round((b.count / dartDist.total) * 100) : 0
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

      {/* ── Round-by-round leaders ── */}
      {rounds.length > 1 && roundLeaders.length > 0 && (
        <>
          <div className="an-section-title">ROUND WINNERS</div>
          <div className="an-round-leaders">
            {roundLeaders.map(rl => (
              <div key={rl.round} className="an-rl-row">
                <div className="an-rl-round">R{rl.round}</div>
                <div className="an-rl-name">{rl.name ?? '—'}</div>
                <div className="an-rl-score">{rl.score ?? '—'} pts</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ── Sub-components ── */

function StatTile({ label, value, unit, accent, dim }) {
  return (
    <div className={`an-stat-tile ${accent ? 'accent' : ''} ${dim ? 'dim' : ''}`}>
      <div className="an-stat-value">{value ?? '—'}</div>
      <div className="an-stat-unit">{unit}</div>
      <div className="an-stat-label">{label}</div>
    </div>
  )
}

function RecordCard({ icon, label, value, unit, sub, color }) {
  return (
    <div className={`an-record-card ${color}`}>
      <div className="an-record-icon">{icon}</div>
      <div className="an-record-label">{label}</div>
      <div className="an-record-value">{value} <span className="an-record-unit">{unit}</span></div>
      <div className="an-record-sub">{sub}</div>
    </div>
  )
}

function MiniStat({ label, value, dim }) {
  return (
    <div className={`an-mini-stat ${dim ? 'dim' : ''}`}>
      <div className="an-mini-val">{value ?? '—'}</div>
      <div className="an-mini-label">{label}</div>
    </div>
  )
}

/* ── Data computation ── */

function stdDev(arr) {
  if (arr.length < 2) return '—'
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length
  const v = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length
  return parseFloat(Math.sqrt(v).toFixed(1))
}

function computeMatchStats(match, players, throws) {
  const matchThrows = throws.filter(t => t.match_id === match.id || true) // already filtered upstream

  // Per-player stats
  const playerStats = players.map(p => {
    const pThrows = matchThrows.filter(t => t.player_id === p.player_id)
    const scores = pThrows.map(t => t.total_score)
    const dartScores = pThrows.flatMap(t => {
      const d = [t.dart1_score]
      if (t.dart2_score !== null) d.push(t.dart2_score)
      return d
    })

    const total = scores.reduce((s, v) => s + v, 0)
    const throwCount = pThrows.length
    const avgPerThrow = throwCount ? parseFloat((total / throwCount).toFixed(1)) : 0
    const avgPerDart = dartScores.length ? parseFloat((total / dartScores.length).toFixed(1)) : 0
    const perfect10s = dartScores.filter(d => d === 10).length
    const perfectThrows = pThrows.filter(t => t.dart1_score === 10 && t.dart2_score === 10).length
    const zeros = pThrows.filter(t => t.total_score === 0).length

    // Round scores
    const roundScores = {}
    for (const t of pThrows) {
      roundScores[t.round_num] = (roundScores[t.round_num] || 0) + t.total_score
    }
    const roundScoreArr = Object.values(roundScores)
    const bestRound = roundScoreArr.length ? Math.max(...roundScoreArr) : 0

    return {
      player_id: p.player_id, name: p.name, player_code: p.player_code,
      total, throwCount, avgPerThrow, avgPerDart,
      perfect10s, perfectThrows, zeros, bestRound,
      roundScores, stdDev: stdDev(scores),
    }
  })

  // Match-wide totals
  const allScores = matchThrows.map(t => t.total_score)
  const allDartScores = matchThrows.flatMap(t => {
    const d = [t.dart1_score]
    if (t.dart2_score !== null) d.push(t.dart2_score)
    return d
  })
  const totalScore = allScores.reduce((s, v) => s + v, 0)
  const totalThrows = matchThrows.length
  const totalDarts = allDartScores.length
  const avgPerThrow = totalThrows ? parseFloat((totalScore / totalThrows).toFixed(1)) : 0
  const avgPerDart = totalDarts ? parseFloat((totalScore / totalDarts).toFixed(1)) : 0
  const perfect10s = allDartScores.filter(d => d === 10).length
  const perfectThrows = matchThrows.filter(t => t.dart1_score === 10 && t.dart2_score === 10).length
  const zeros = matchThrows.filter(t => t.total_score === 0).length

  const bestThrow = matchThrows.length
    ? matchThrows.reduce((best, t) => t.total_score > best.total_score ? t : best, matchThrows[0])
    : null
  const worstThrow = matchThrows.length
    ? matchThrows.reduce((worst, t) => t.total_score < worst.total_score ? t : worst, matchThrows[0])
    : null

  // Best round across all players
  let bestRoundEntry = null
  for (const ps of playerStats) {
    for (const [rn, score] of Object.entries(ps.roundScores)) {
      if (!bestRoundEntry || score > bestRoundEntry.score) {
        bestRoundEntry = { score, round: Number(rn), playerName: ps.name }
      }
    }
  }

  // Most consistent (lowest stdDev among players with ≥3 throws)
  const eligibleForConsistency = playerStats.filter(ps => ps.throwCount >= 3 && ps.stdDev !== '—')
  const mostConsistent = eligibleForConsistency.length
    ? eligibleForConsistency.reduce((best, p) => p.stdDev < best.stdDev ? p : best, eligibleForConsistency[0])
    : null

  // Most perfect darts
  const byPerfect = [...playerStats].sort((a, b) => b.perfect10s - a.perfect10s)
  const highestSingleDart = byPerfect[0]?.perfect10s > 0
    ? { name: byPerfect[0].name, count: byPerfect[0].perfect10s }
    : null

  // Win margin
  const sortedByTotal = [...playerStats].sort((a, b) => b.total - a.total)
  const biggestWinMargin = sortedByTotal.length >= 2 && sortedByTotal[0].total > 0
    ? sortedByTotal[0].total - sortedByTotal[1].total
    : null

  // Round-by-round leaders
  const rounds = Array.from({ length: match.total_rounds }, (_, i) => i + 1)
  const roundLeaders = rounds.map(r => {
    const roundEntries = playerStats
      .filter(ps => ps.roundScores[r] !== undefined)
      .map(ps => ({ name: ps.name, score: ps.roundScores[r] }))
      .sort((a, b) => b.score - a.score)
    return { round: r, name: roundEntries[0]?.name ?? null, score: roundEntries[0]?.score ?? null }
  }).filter(rl => rl.name !== null)

  // Dart distribution buckets
  const buckets = [
    { label: '10 (Perfect)', min: 10, max: 10, accent: true,  count: 0 },
    { label: '8–9',          min: 8,  max: 9,  accent: false, count: 0 },
    { label: '5–7',          min: 5,  max: 7,  accent: false, count: 0 },
    { label: '2–4',          min: 2,  max: 4,  accent: false, count: 0 },
    { label: '1',            min: 1,  max: 1,  accent: false, count: 0 },
    { label: '0 (Miss)',     min: 0,  max: 0,  dim: true,     count: 0 },
  ]
  for (const d of allDartScores) {
    for (const b of buckets) { if (d >= b.min && d <= b.max) { b.count++; break } }
  }

  return {
    playerStats,
    roundLeaders,
    dartDist: { buckets, total: allDartScores.length },
    matchTotals: {
      totalScore, totalThrows, totalDarts, avgPerThrow, avgPerDart,
      perfect10s, perfectThrows, zeros,
      bestThrow, worstThrow, bestRoundEntry, mostConsistent,
      highestSingleDart, biggestWinMargin,
    },
  }
}
