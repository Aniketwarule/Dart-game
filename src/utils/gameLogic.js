// Tiebreaker: given equal total points, rank by most 10s → most 9s → ...
// Returns negative if a beats b, positive if b beats a, 0 if truly equal
export function tiebreakCompare(a, b) {
  // a.dartScores and b.dartScores are arrays of all individual dart values
  for (let val = 10; val >= 0; val--) {
    const aCount = (a.dartScores || []).filter(d => d === val).length
    const bCount = (b.dartScores || []).filter(d => d === val).length
    if (aCount !== bCount) return bCount - aCount // more high scores = better
  }
  return 0
}

// Sort players by total desc, then tiebreaker
export function sortStandings(players) {
  return [...players].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total
    return tiebreakCompare(a, b)
  })
}

// Get a human-readable tiebreaker description
export function getTiebreakNote(winner, loser) {
  for (let val = 10; val >= 1; val--) {
    const wCount = (winner.dartScores || []).filter(d => d === val).length
    const lCount = (loser.dartScores || []).filter(d => d === val).length
    if (wCount > lCount) return `Won on countback (more ${val}s)`
  }
  return 'Won on countback'
}

// Format player code (ensure 3-digit zero-padded)
export function formatCode(n) {
  return String(n).padStart(3, '0')
}

// Format date nicely
export function formatDate(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

// Compute per-player stats from raw throw rows
export function computeStats(players, throwRows, match) {
  return players.map(p => {
    const myThrows = throwRows.filter(t => t.player_id === p.player_id)
    const dartScores = myThrows.flatMap(t => {
      const d = [t.dart1_score]
      if (match.darts_per_throw === 2 && t.dart2_score !== null) d.push(t.dart2_score)
      return d
    })
    const total = myThrows.reduce((s, t) => s + t.total_score, 0)
    const allDartCount = dartScores.length
    const avg = allDartCount ? (total / myThrows.length).toFixed(1) : null // avg per throw
    const dartAvg = allDartCount ? (total / allDartCount).toFixed(1) : null

    // Group throws by round
    const roundScores = {}
    for (let r = 1; r <= match.total_rounds; r++) {
      const rThrows = myThrows.filter(t => t.round_num === r)
      if (rThrows.length) roundScores[r] = rThrows.reduce((s, t) => s + t.total_score, 0)
    }

    const roundScoreArr = Object.values(roundScores)
    const bestRound = roundScoreArr.length ? Math.max(...roundScoreArr) : null
    const perfectDarts = dartScores.filter(d => d === 10).length
    const wins = 0 // filled at match level

    return {
      ...p,
      total,
      avg,
      dartAvg,
      dartScores,
      roundScores,
      roundScoreArr,
      bestRound,
      perfectDarts,
      throwCount: myThrows.length,
    }
  })
}
