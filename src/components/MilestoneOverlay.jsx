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
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = document.getElementById('confetti-canvas')
    if (!canvas) return
    const myConfetti = confetti.create(canvas, { resize: true, useWorker: true })

    // fire confetti
    const burst = () => {
      myConfetti({
        particleCount: type === 'match_winner' ? 200 : 80,
        spread: 100,
        startVelocity: 45,
        origin: { x: 0.5, y: 0.3 },
        colors: cfg.confettiColors,
        ticks: 200,
      })
    }
    burst()
    if (type === 'match_winner') {
      setTimeout(burst, 400)
      setTimeout(burst, 800)
    }

    const timer = setTimeout(onDone, type === 'match_winner' ? 3000 : 1800)
    return () => {
      clearTimeout(timer)
      myConfetti.reset()
    }
  }, [type])

  return (
    <>
      <canvas id="confetti-canvas" style={{ position:'fixed',inset:0,pointerEvents:'none',zIndex:1001,width:'100%',height:'100%' }} />
      <div className="milestone-overlay" onClick={onDone}>
        <div className="milestone-card">
          <span className="milestone-emoji">{cfg.emoji}</span>
          <div className="milestone-label">{cfg.label}</div>
          <div className="milestone-title" style={{ color: cfg.color }}>{playerName}</div>
          {extra && <div className="milestone-sub">{extra}</div>}
        </div>
      </div>
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
