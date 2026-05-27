// InsightBar — shows "Player X needs N pts in Y throws"
export default function InsightBar({ player, match, currentRound, throwsDone, stats }) {
  if (!player || !match || !stats) return null

  const myStats = stats.find(s => s.player_id === player.player_id)
  if (!myStats) return null

  const topTotal = Math.max(...stats.map(s => s.total))
  const myTotal = myStats.total

  // Throws remaining in this match
  const throwsPerRound = match.throws_per_round
  const totalRounds = match.total_rounds
  const throwsDoneInRound = throwsDone
  const throwsLeftInRound = throwsPerRound - throwsDoneInRound
  const roundsLeft = totalRounds - currentRound  // rounds after current
  const totalThrowsLeft = throwsLeftInRound + roundsLeft * throwsPerRound

  // Max possible score remaining
  const maxPerThrow = match.darts_per_throw === 2 ? 20 : 10
  const maxRemaining = totalThrowsLeft * maxPerThrow

  if (myTotal === topTotal && totalThrowsLeft > 0) {
    // Currently leading
    const lead = stats
      .filter(s => s.player_id !== player.player_id)
      .reduce((m, s) => Math.max(m, s.total), 0)
    const leadBy = myTotal - lead
    return (
      <div className="insight-bar">
        <span className="insight-icon">👑</span>
        <span>
          <strong>{player.name}</strong> leads by <strong>{leadBy} pts</strong> · {totalThrowsLeft} throw{totalThrowsLeft !== 1 ? 's' : ''} left
        </span>
      </div>
    )
  }

  if (topTotal > myTotal) {
    const gap = topTotal - myTotal
    const leader = stats.find(s => s.total === topTotal)
    if (gap > maxRemaining) {
      return (
        <div className="insight-bar">
          <span className="insight-icon">💔</span>
          <span>
            <strong>{player.name}</strong> can't catch <strong>{leader?.name}</strong> — gap of <strong>{gap} pts</strong> too large
          </span>
        </div>
      )
    }
    return (
      <div className="insight-bar">
        <span className="insight-icon">🎯</span>
        <span>
          <strong>{player.name}</strong> needs <strong>{gap} more pts</strong> in <strong>{totalThrowsLeft} throw{totalThrowsLeft !== 1 ? 's' : ''}</strong> to catch <strong>{leader?.name}</strong>
        </span>
      </div>
    )
  }

  return (
    <div className="insight-bar">
      <span className="insight-icon">📊</span>
      <span>{totalThrowsLeft} throw{totalThrowsLeft !== 1 ? 's' : ''} remaining in match</span>
    </div>
  )
}
