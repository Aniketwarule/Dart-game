import { useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'

const MILESTONE_CONFIG = {
  perfect_dart:   { emoji: '🎯', label: 'Perfect Dart!', color: '#c8ff00', confettiColors: ['#c8ff00', '#ffffff', '#39e07b'] },
  perfect_throw:  { emoji: '💥', label: 'Perfect Throw!!', color: '#c8ff00', confettiColors: ['#c8ff00', '#ff5c1a', '#ffffff'] },
  took_lead:      { emoji: '👑', label: 'Taking the Lead!', color: '#ffd700', confettiColors: ['#ffd700', '#c8ff00', '#ffffff'] },
  personal_best:  { emoji: '🔥', label: 'Personal Best Round!', color: '#ff5c1a', confettiColors: ['#ff5c1a', '#c8ff00', '#ffffff'] },
  milestone_50:   { emoji: '🎉', label: '50 Points!', color: '#c8ff00', confettiColors: ['#c8ff00', '#39e07b', '#ffffff'] },
  milestone_100:  { emoji: '🎉', label: '100 Points!', color: '#c8ff00', confettiColors: ['#c8ff00', '#ffd700', '#ff5c1a'] },
  milestone_150:  { emoji: '🎊', label: '150 Points!', color: '#ff5c1a', confettiColors: ['#ff5c1a', '#c8ff00', '#ffd700'] },
  milestone_200:  { emoji: '🚀', label: '200 Points!', color: '#ffd700', confettiColors: ['#ffd700', '#c8ff00', '#ff5c1a'] },
  match_winner:   { emoji: '🏆', label: 'Match Winner!', color: '#ffd700', confettiColors: ['#ffd700', '#c8ff00', '#ffffff', '#ff5c1a'] },
}

export default function MilestoneOverlay({ type, playerName, extra, onDone }) {
  const cfg = MILESTONE_CONFIG[type] || MILESTONE_CONFIG.milestone_50
  const isWinner = type === 'match_winner'

  useEffect(() => {
    const canvas = document.getElementById('confetti-canvas')
    if (!canvas) return
    const myConfetti = confetti.create(canvas, { resize: true, useWorker: true })

    const burst = (opts = {}) => {
      myConfetti({
        particleCount: isWinner ? 160 : 80,
        spread: isWinner ? 120 : 100,
        startVelocity: isWinner ? 55 : 45,
        origin: opts.origin || { x: 0.5, y: 0.3 },
        colors: cfg.confettiColors,
        ticks: isWinner ? 350 : 200,
        gravity: 0.8,
        scalar: isWinner ? 1.2 : 1,
        ...opts
      })
    }

    // Initial burst
    burst()

    if (isWinner) {
      // Multiple dramatic bursts for winner
      setTimeout(() => burst({ origin: { x: 0.2, y: 0.4 }, spread: 80 }), 300)
      setTimeout(() => burst({ origin: { x: 0.8, y: 0.4 }, spread: 80 }), 500)
      setTimeout(() => burst({ origin: { x: 0.5, y: 0.2 }, spread: 140 } ), 800)
      setTimeout(() => burst({ origin: { x: 0.3, y: 0.5 }, spread: 80 }), 1200)
      setTimeout(() => burst({ origin: { x: 0.7, y: 0.5 }, spread: 80 }), 1500)
      setTimeout(() => burst({ spread: 180, particleCount: 200 }), 2000)
    }

    const timer = setTimeout(onDone, isWinner ? 6000 : 1800)
    return () => {
      clearTimeout(timer)
      myConfetti.reset()
    }
  }, [type])

  return (
    <>
      <canvas
        id="confetti-canvas"
        style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1003, width: '100%', height: '100%' }}
      />

      {isWinner ? (
        /* ── Full-screen Winner Celebration ── */
        <div className="winner-celebration-overlay" onClick={onDone}>
          <div className="wc-rays" />
          <div className="wc-trophy">🏆</div>
          <div className="wc-label">Match Winner</div>
          <div className="wc-name">{playerName}</div>
          {extra && <div className="wc-score">{extra}</div>}
          <div className="wc-dismiss">TAP TO CONTINUE</div>
        </div>
      ) : (
        /* ── Regular milestone card ── */
        <div className="milestone-overlay" onClick={onDone}>
          <div className="milestone-card">
            <span className="milestone-emoji">{cfg.emoji}</span>
            <div className="milestone-label">{cfg.label}</div>
            <div className="milestone-title" style={{ color: cfg.color }}>{playerName}</div>
            {extra && <div className="milestone-sub">{extra}</div>}
          </div>
        </div>
      )}
    </>
  )
}

// Helper: check what milestone(s) a score/throw triggers
export function checkMilestones({ prevTotal, newTotal, dart1, dart2, dartsPerThrow, roundScore, prevBestRound, wasLeading, nowLeading }) {
  const milestones = []

  // Per-dart perfects
  if (dart1 === 10) milestones.push('perfect_dart')
  if (dartsPerThrow === 2 && dart2 === 10 && dart1 === 10) {
    milestones.push('perfect_throw')
    milestones.splice(milestones.indexOf('perfect_dart'), 1) // upgrade, don't double-fire
  }
  if (dartsPerThrow === 1 && dart1 === 10) {} // already pushed perfect_dart

  // Personal best round
  if (prevBestRound !== null && roundScore > prevBestRound) {
    milestones.push('personal_best')
  }

  // Point milestones (crossed thresholds)
  for (const threshold of [50, 100, 150, 200]) {
    if (prevTotal < threshold && newTotal >= threshold) {
      milestones.push(`milestone_${threshold}`)
    }
  }

  // Took the lead
  if (!wasLeading && nowLeading) milestones.push('took_lead')

  return milestones
}
