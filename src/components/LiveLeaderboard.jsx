import { sortStandings, getTiebreakNote } from '../utils/gameLogic'

export default function LiveLeaderboard({ stats, match, currentRound, activePlayerId }) {
  const sorted = sortStandings(stats)
  const topTotal = sorted[0]?.total ?? 0

  // Check for ties in top position
  const ties = sorted.filter(s => s.total === topTotal && topTotal > 0)

  return (
    <div className="lb-col">
      <div className="lb-header-row">
        <span className="lb-title-text">LEADERBOARD</span>
        <span className="lb-subtitle">
          round {currentRound} of {match.total_rounds}
        </span>
      </div>

      <div className="lb-list">
        {sorted.map((s, rank) => {
          const isActive = s.player_id === activePlayerId
          const isTied = ties.length > 1 && s.total === topTotal && topTotal > 0
          const tieNote = isTied && rank === 0
            ? getTiebreakNote(s, sorted[1])
            : null

          const roundScoresArr = []
          for (let r = 1; r <= match.total_rounds; r++) {
            roundScoresArr.push(s.roundScores?.[r] ?? undefined)
          }

          const rankClass =
            rank === 0 ? 'r1' : rank === 1 ? 'r2' : rank === 2 ? 'r3' : ''
          const rankEmoji = ['🥇','🥈','🥉']

          return (
            <div
              key={s.player_id}
              className={`lb-row ${isActive ? 'is-active' : ''} ${rank === 0 && s.total > 0 ? 'rank-1' : ''} ${isTied ? 'tiebreak' : ''}`}
            >
              {/* rank badge */}
              <div className={`lb-rank ${rankClass}`}>
                {rank < 3 ? rankEmoji[rank] : rank + 1}
              </div>

              {/* info */}
              <div className="lb-info">
                <div className="lb-player-name">
                  {s.name}
                  {isActive && <span className="lb-throwing-tag">Throwing</span>}
                </div>
                <div className="lb-player-id">{s.player_code}</div>
                <div className="lb-avg">
                  {s.avg !== null
                    ? `avg ${s.avg} / throw · ${s.dartAvg}/dart`
                    : 'no throws yet'}
                </div>
                {tieNote && <div className="lb-tiebreak-note">⚡ {tieNote}</div>}
              </div>

              {/* round chips (hide on mobile via CSS) */}
              <div className="lb-rounds">
                {roundScoresArr.map((sc, i) => {
                  let cls = 'lb-round-chip'
                  if (sc !== undefined) {
                    cls += sc === s.bestRound && s.roundScoreArr.length > 1 ? ' best' : ' done'
                  } else if (i + 1 === currentRound && isActive) {
                    cls += ' current-round'
                  }
                  return (
                    <div key={i} className={cls}>
                      {sc !== undefined ? sc : i + 1 === currentRound && isActive ? '…' : '—'}
                    </div>
                  )
                })}
              </div>

              {/* total */}
              <div className="lb-total">
                <div className="lb-total-num">{s.total}</div>
                <div className="lb-total-label">pts</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
