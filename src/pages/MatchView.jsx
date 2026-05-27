import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'
import { computeStats, sortStandings } from '../utils/gameLogic'
import LiveLeaderboard from '../components/LiveLeaderboard'
import ScoreEntry from '../components/ScoreEntry'
import InsightBar from '../components/InsightBar'
import MilestoneOverlay, { checkMilestones } from '../components/MilestoneOverlay'
import MatchAnalytics from '../components/MatchAnalytics'
import { useAudio } from '../context/AudioContext'

/**
 * MatchView — shared by Home (readOnly=true) and Admin (readOnly=false)
 * When readOnly=true: just shows live leaderboard + topbar, no score entry
 */
export default function MatchView({ match: matchProp, readOnly = false, onMatchFinished, onMatchAborted }) {
  const [match, setMatch] = useState(matchProp)
  const [matchPlayers, setMatchPlayers] = useState([])
  const [throws, setThrows] = useState([])
  const [loading, setLoading] = useState(true)
  const [finishing, setFinishing] = useState(false)
  const [viewMode, setViewMode] = useState('game')  // 'game' | 'analytics'
  const [isTvMode, setIsTvMode] = useState(false)
  const { playThud, announce } = useAudio()

  // TV mode escape handler
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isTvMode) setIsTvMode(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isTvMode])

  // Game pointer state (computed from throws)
  const [gameState, setGameState] = useState({
    round: 1,
    playerIdx: 0,
    throwInRound: 0,
  })
  const [allDone, setAllDone] = useState(false)

  const [milestone, setMilestone] = useState(null)
  const [milestoneQueue, setMilestoneQueue] = useState([])

  // Track if we've already auto-finished to avoid double-firing
  const finishCalledRef = useRef(false)

  // ------ Fetch players + throws ------
  async function loadMatch() {
    // Re-fetch match status too (in case it changed externally)
    const { data: freshMatch } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchProp.id)
      .single()
    if (freshMatch) setMatch(freshMatch)

    const { data: mps } = await supabase
      .from('match_players')
      .select('player_id, turn_order, players(name, player_code)')
      .eq('match_id', matchProp.id)
      .order('turn_order')

    const players = (mps || []).map(mp => ({
      player_id: mp.player_id,
      name: mp.players.name,
      player_code: mp.players.player_code,
      turn_order: mp.turn_order,
    }))
    setMatchPlayers(players)

    const { data: trows } = await supabase
      .from('throws')
      .select('*')
      .eq('match_id', matchProp.id)
      .order('created_at')

    setThrows(trows || [])
    setLoading(false)
  }

  useEffect(() => {
    finishCalledRef.current = false
    loadMatch()

    const channel = supabase
      .channel(`match-${matchProp.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'throws',
        filter: `match_id=eq.${matchProp.id}`
      }, payload => {
        const t = payload.new
        setThrows(prev => [...prev, t])
        if (t.total_score > 0) {
          playThud()
          if (t.dart1_score === 10 && t.dart2_score === 10) announce("Perfect throw!")
          else if (matchProp.darts_per_throw === 1 && t.total_score === 10) announce("Perfect!")
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'matches',
        filter: `id=eq.${matchProp.id}`
      }, payload => {
        setMatch(payload.new)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [matchProp.id])

  // ------ Compute game pointer from throws ------
  useEffect(() => {
    if (!matchPlayers.length) return
    const numPlayers = matchPlayers.length
    const tpr = match.throws_per_round

    for (let r = 1; r <= match.total_rounds; r++) {
      for (let pi = 0; pi < numPlayers; pi++) {
        const p = matchPlayers[pi]
        const count = throws.filter(t => t.player_id === p.player_id && t.round_num === r).length
        if (count < tpr) {
          setGameState({ round: r, playerIdx: pi, throwInRound: count })
          setAllDone(false)
          return
        }
      }
    }

    // All throws completed
    setGameState({ round: match.total_rounds, playerIdx: 0, throwInRound: match.throws_per_round })
    setAllDone(true)
    // NOTE: do NOT call onMatchFinished here — that's done only after DB update in finishMatch()
  }, [throws, matchPlayers])

  // ------ Auto-finish when all done and admin ------
  // We don't auto-finish — we show a prominent FINISH MATCH button instead
  // This gives admin a chance to verify before committing

  // ------ Stats ------
  const stats = computeStats(matchPlayers, throws, match)
  const sorted = sortStandings(stats)
  const currentPlayer = allDone ? null : matchPlayers[gameState.playerIdx]

  // ------ Record throw (admin only) ------
  async function handleRecordThrow(dart1, dart2, total) {
    if (!currentPlayer || readOnly || allDone) return

    const prevStats = computeStats(matchPlayers, throws, match)
    const prevMe = prevStats.find(s => s.player_id === currentPlayer.player_id)
    const prevTotal = prevMe?.total ?? 0
    const prevBestRound = prevMe?.bestRound ?? null
    const prevLeader = sortStandings(prevStats)[0]?.player_id

    const newThrow = {
      match_id: match.id,
      player_id: currentPlayer.player_id,
      round_num: gameState.round,
      throw_num: gameState.throwInRound + 1,
      dart1_score: dart1,
      dart2_score: match.darts_per_throw === 2 ? dart2 : null,
      total_score: total,
    }

    const { data: inserted } = await supabase.from('throws').insert(newThrow).select().single()
    if (!inserted) return

    const newThrows = [...throws, inserted]
    const newStats = computeStats(matchPlayers, newThrows, match)
    const newMe = newStats.find(s => s.player_id === currentPlayer.player_id)
    const newTotal = newMe?.total ?? 0
    const newLeader = sortStandings(newStats)[0]?.player_id

    const roundThrows = newThrows.filter(t =>
      t.player_id === currentPlayer.player_id && t.round_num === gameState.round
    )
    const roundScore = roundThrows.reduce((s, t) => s + t.total_score, 0)

    const detected = checkMilestones({
      prevTotal,
      newTotal,
      dart1,
      dart2: dart2 ?? 0,
      dartsPerThrow: match.darts_per_throw,
      roundScore,
      prevBestRound,
      wasLeading: prevLeader === currentPlayer.player_id,
      nowLeading: newLeader === currentPlayer.player_id,
    })

    if (detected.length) {
      setMilestoneQueue(detected.map(type => ({
        type,
        playerName: currentPlayer.name,
        extra: type === 'took_lead'
          ? `Total: ${newTotal} pts`
          : type.startsWith('milestone_')
            ? `${currentPlayer.name} has ${newTotal} pts!`
            : null
      })))
    }
  }

  // ------ Milestone queue draining ------
  useEffect(() => {
    if (!milestone && milestoneQueue.length > 0) {
      const [next, ...rest] = milestoneQueue
      setMilestone(next)
      setMilestoneQueue(rest)
    }
  }, [milestone, milestoneQueue])

  // ------ Finish match ------
  async function finishMatch() {
    if (finishing || finishCalledRef.current) return
    finishCalledRef.current = true
    setFinishing(true)

    const winner = sorted[0]
    const { error } = await supabase.from('matches').update({
      status: 'finished',
      winner_player_id: winner?.player_id ?? null,
      finished_at: new Date().toISOString(),
    }).eq('id', match.id)

    if (error) {
      console.error('Failed to finish match:', error)
      finishCalledRef.current = false
      setFinishing(false)
      return
    }

    // Update local match state so UI reflects finished
    setMatch(prev => ({ ...prev, status: 'finished', winner_player_id: winner?.player_id ?? null }))

    // Fire winner milestone overlay
    setMilestone({
      type: 'match_winner',
      playerName: winner?.name ?? '?',
      extra: `${winner?.total ?? 0} pts`
    })

    // Navigate away after winner overlay completes
    setTimeout(() => {
      onMatchFinished?.()
    }, 3500)

    setFinishing(false)
  }

  // ------ Abort match ------
  async function abortMatch() {
    if (!window.confirm('Abort this match? This cannot be undone. The match will be excluded from all stats.')) return
    await supabase.from('matches').update({ status: 'aborted' }).eq('id', match.id)
    setMatch(prev => ({ ...prev, status: 'aborted' }))
    onMatchAborted?.()
  }

  if (loading) {
    return <div className="loading-center"><div className="spinner" /><span>Loading match…</span></div>
  }

  const isFinished = match.status === 'finished'
  const isAborted = match.status === 'aborted'

  // Clamped display values for topbar
  const displayThrow = allDone ? match.throws_per_round : Math.min(gameState.throwInRound + 1, match.throws_per_round)
  const displayRound = gameState.round

  return (
    <>
      {milestone && (
        <MilestoneOverlay
          type={milestone.type}
          playerName={milestone.playerName}
          extra={milestone.extra}
          onDone={() => setMilestone(null)}
        />
      )}

      <div className={`game-layout ${isTvMode ? 'tv-mode' : ''}`}>
        {/* Top bar */}
        <div className="game-topbar">
          <div className="topbar-badges">
            <div className="topbar-badge">
              <span className="label">Round</span>
              <span className="value">{displayRound}</span>
            </div>
            <div className="topbar-divider" />
            <div className="topbar-badge">
              <span className="label">of</span>
              <span className="value">{match.total_rounds}</span>
            </div>
            <div className="topbar-divider" />
            <div className="topbar-badge">
              <span className="label">Throw</span>
              <span className="value">{displayThrow}</span>
            </div>
            <div className="topbar-divider" />
            <div className="topbar-badge">
              <span className="label">of</span>
              <span className="value">{match.throws_per_round}</span>
            </div>
            <div className="topbar-divider" />
            <div className="topbar-badge">
              <span className="label">Darts</span>
              <span className="value">{match.darts_per_throw}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {match.title && <span className="topbar-match-title">{match.title}</span>}
            {!isFinished && !isAborted && (
              <span className="topbar-live">
                <span className="live-dot" /> LIVE
              </span>
            )}
            {isAborted && <span className="status-badge aborted">⚠ Aborted</span>}
            {isFinished && <span className="status-badge finished">✓ Finished</span>}
          </div>

          {!readOnly && !isFinished && !isAborted && (
            <button className="btn btn-danger" onClick={abortMatch} id="abort-match-btn">
              ⚠ Abort Match
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => setIsTvMode(!isTvMode)} title="TV Mode (Esc to exit)">
            📺
          </button>
        </div>

        {/* View mode toggle */}
        <div className="match-view-tabs">
          <button
            className={`match-view-tab ${viewMode === 'game' ? 'active' : ''}`}
            onClick={() => setViewMode('game')}
            id="mv-tab-game"
          >
            🎯 {readOnly ? 'Live' : 'Score Entry'}
          </button>
          <button
            className={`match-view-tab ${viewMode === 'analytics' ? 'active' : ''}`}
            onClick={() => setViewMode('analytics')}
            id="mv-tab-analytics"
          >
            📊 Analytics
          </button>
        </div>

        {/* Analytics full-width view */}
        {viewMode === 'analytics' && (
          <div style={{ gridColumn: '1 / -1' }}>
            <MatchAnalytics match={match} players={matchPlayers} throws={throws} />
          </div>
        )}

        {/* Left: throw panel — hidden in analytics mode */}
        {viewMode === 'game' && (!readOnly && !isFinished && !isAborted ? (
          <div className="throw-panel">
            {allDone ? (
              /* All throws done — show winner preview + finish button */
              <div className="cp-card" style={{ borderColor: 'rgba(200,255,0,0.3)' }}>
                <div className="cp-eyebrow">All Throws Complete</div>
                <div className="cp-name" style={{ fontSize: '1.6rem' }}>
                  🏆 {sorted[0]?.name}
                </div>
                <div className="cp-id">{sorted[0]?.total} pts · tap below to finish</div>
              </div>
            ) : (
              /* Current player card */
              <div className="cp-card">
                <div className="cp-eyebrow">Now Throwing</div>
                <div className="cp-name">{currentPlayer?.name ?? '—'}</div>
                <div className="cp-id">{currentPlayer?.player_code}</div>

                <div className="throw-dots">
                  {Array.from({ length: match.throws_per_round }).map((_, i) => {
                    const throwData = throws.filter(t =>
                      t.player_id === currentPlayer?.player_id &&
                      t.round_num === gameState.round
                    )[i]
                    const isDone = throwData !== undefined
                    const isActive = i === gameState.throwInRound

                    return (
                      <div
                        key={i}
                        className={`throw-dot${isDone ? ' scored' : ''}${isActive && !isDone ? ' active' : ''}`}
                        title={throwData
                          ? match.darts_per_throw === 2
                            ? `${throwData.dart1_score}+${throwData.dart2_score}=${throwData.total_score}`
                            : String(throwData.total_score)
                          : ''}
                      >
                        {isDone ? throwData.total_score : i + 1}
                        {isDone && match.darts_per_throw === 2 && (
                          <span className="throw-dot-sub">{throwData.dart1_score}+{throwData.dart2_score}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Insight bar — hide when all done */}
            {!allDone && (
              <InsightBar
                player={currentPlayer}
                match={match}
                currentRound={gameState.round}
                throwsDone={gameState.throwInRound}
                stats={stats}
              />
            )}

            {/* Score entry — disabled when all done */}
            {!allDone && (
              <ScoreEntry
                dartsPerThrow={match.darts_per_throw}
                throwsPerRound={match.throws_per_round}
                currentThrow={gameState.throwInRound + 1}
                onRecordThrow={handleRecordThrow}
                disabled={false}
              />
            )}

            {/* Finish match button — prominent when all done */}
            {allDone && (
              <button
                className="btn btn-primary btn-full btn-lg"
                onClick={finishMatch}
                disabled={finishing}
                id="finish-match-btn"
                style={{ marginTop: 8 }}
              >
                {finishing ? 'Saving…' : '🏆 FINISH MATCH'}
              </button>
            )}
          </div>
        ) : (
          /* Read-only OR finished/aborted view */
          <div className="throw-panel">
            <div className="cp-card">
              <div className="cp-eyebrow">
                {isFinished ? 'Match Finished' : isAborted ? 'Match Aborted' : 'Now Throwing'}
              </div>
              {!isFinished && !isAborted && currentPlayer && (
                <>
                  <div className="cp-name">{currentPlayer.name}</div>
                  <div className="cp-id">{currentPlayer.player_code}</div>
                  <div className="throw-dots">
                    {Array.from({ length: match.throws_per_round }).map((_, i) => {
                      const throwData = throws.filter(t =>
                        t.player_id === currentPlayer.player_id &&
                        t.round_num === gameState.round
                      )[i]
                      const isDone = throwData !== undefined
                      const isActive = i === gameState.throwInRound
                      return (
                        <div key={i} className={`throw-dot${isDone?' scored':''}${isActive&&!isDone?' active':''}`}>
                          {isDone ? throwData.total_score : i+1}
                        </div>
                      )
                    })}
                  </div>
                  <InsightBar
                    player={currentPlayer}
                    match={match}
                    currentRound={gameState.round}
                    throwsDone={gameState.throwInRound}
                    stats={stats}
                  />
                </>
              )}
              {(isFinished || (!currentPlayer && !isAborted)) && sorted[0] && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>Winner</div>
                  <div className="cp-name">🏆 {sorted[0].name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)' }}>{sorted[0].total} pts</div>
                </div>
              )}
              {isAborted && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--orange)' }}>
                  This match was aborted and excluded from stats.
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Right: leaderboard — hidden in analytics mode */}
        {viewMode === 'game' && (
          <LiveLeaderboard
            stats={stats}
            match={match}
            currentRound={displayRound}
            activePlayerId={allDone ? null : currentPlayer?.player_id}
          />
        )}
      </div>
    </>
  )
}
