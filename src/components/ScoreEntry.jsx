import { useEffect, useRef, useState } from 'react'

const SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
// Keyboard: 1-9 → 1-9, 0 → 10, ` or m → 0 (miss)

export default function ScoreEntry({ dartsPerThrow, throwsPerRound, currentThrow, onRecordThrow, disabled }) {
  const dart1Ref = useRef(null)
  const dart2Ref = useRef(null)
  const [dart1, setDart1] = useState('')
  const [dart2, setDart2] = useState('')

  // Reset inputs when turn changes
  useEffect(() => {
    setDart1(''); setDart2('')
  }, [currentThrow])

  // Keyboard shortcuts — only when not in an input
  useEffect(() => {
    if (disabled) return
    function handleKey(e) {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const key = e.key
      let val = null
      if (key === '0') val = 10
      else if (key >= '1' && key <= '9') val = parseInt(key)
      else if (key === '`' || key === 'm' || key === 'M') val = 0

      if (val !== null) {
        e.preventDefault()
        if (dartsPerThrow === 2) {
          if (dart1 === '') {
            setDart1(String(val))
          } else if (dart2 === '') {
            setDart2(String(val))
          }
        } else {
          handleSubmit(val, null)
        }
      }
      if ((key === 'Enter' || key === ' ') && dart1 !== '') {
        e.preventDefault()
        submitCurrent()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [disabled, dart1, dart2, dartsPerThrow, currentThrow])

  function submitCurrent() {
    const d1 = parseInt(dart1)
    if (isNaN(d1)) return
    if (dartsPerThrow === 2) {
      const d2 = parseInt(dart2)
      if (isNaN(d2)) { dart2Ref.current?.focus(); return }
      handleSubmit(d1, d2)
    } else {
      handleSubmit(d1, null)
    }
  }

  function handleSubmit(d1, d2) {
    if (d1 < 0 || d1 > 10) return
    if (d2 !== null && (d2 < 0 || d2 > 10)) return
    const total = d1 + (d2 ?? 0)
    onRecordThrow(d1, d2, total)
    setDart1(''); setDart2('')
  }

  function quickScore(val) {
    if (dartsPerThrow === 1) {
      handleSubmit(val, null)
      return
    }
    if (dart1 === '') {
      setDart1(String(val))
    } else {
      handleSubmit(parseInt(dart1), val)
    }
  }

  const d1Val = dart1 !== '' ? parseInt(dart1) : null
  const d2Val = dart2 !== '' ? parseInt(dart2) : null
  const computedTotal = (d1Val ?? 0) + (d2Val ?? 0)
  const canSubmit = dartsPerThrow === 1 ? dart1 !== '' : (dart1 !== '' && dart2 !== '')

  return (
    <div className="score-card">
      <div className="score-card-label">
        Enter Score — Throw {currentThrow} of {throwsPerRound}
      </div>

      {dartsPerThrow === 2 ? (
        <div className="dart-inputs">
          <div className="dart-input-wrap">
            <span className="dart-input-label">Dart 1</span>
            <input
              ref={dart1Ref}
              id="dart1-input"
              type="number"
              className="big-score-input"
              min={0} max={10}
              placeholder="—"
              value={dart1}
              disabled={disabled}
              onChange={e => {
                const v = e.target.value
                if (v === '' || (parseInt(v) >= 0 && parseInt(v) <= 10)) {
                  setDart1(v)
                }
              }}
              onKeyDown={e => { if (e.key === 'Enter') dart2Ref.current?.focus() }}
            />
          </div>

          <span className="dart-plus">+</span>

          <div className="dart-input-wrap">
            <span className="dart-input-label">Dart 2</span>
            <input
              ref={dart2Ref}
              id="dart2-input"
              type="number"
              className="big-score-input"
              min={0} max={10}
              placeholder="—"
              value={dart2}
              disabled={disabled || dart1 === ''}
              onChange={e => {
                const v = e.target.value
                if (v === '' || (parseInt(v) >= 0 && parseInt(v) <= 10)) setDart2(v)
              }}
              onKeyDown={e => { if (e.key === 'Enter') submitCurrent() }}
            />
          </div>

          <span className="dart-eq">=</span>

          <div className="dart-total-display">
            <div className="dart-total-label">Total</div>
            <div className="dart-total-num">{dart1 !== '' ? computedTotal : '—'}</div>
          </div>
        </div>
      ) : (
        <div className="single-dart-row">
          <input
            ref={dart1Ref}
            id="dart1-input"
            type="number"
            className="big-score-input"
            style={{ flex: 1 }}
            min={0} max={10}
            placeholder="—"
            value={dart1}
            disabled={disabled}
            onChange={e => {
              const v = e.target.value
              if (v === '' || (parseInt(v) >= 0 && parseInt(v) <= 10)) setDart1(v)
            }}
            onKeyDown={e => { if (e.key === 'Enter') submitCurrent() }}
          />
          <button
            className="btn-throw"
            onClick={submitCurrent}
            disabled={disabled || !canSubmit}
            id="throw-submit-btn"
          >
            THROW ✓
          </button>
        </div>
      )}

      {dartsPerThrow === 2 && (
        <button
          className="btn btn-orange btn-full"
          style={{ marginBottom: 14 }}
          onClick={submitCurrent}
          disabled={disabled || !canSubmit}
          id="throw-submit-btn"
        >
          RECORD THROW ✓
        </button>
      )}

      <div className="quick-grid-label">Quick Score {dartsPerThrow === 2 ? (dart1 === '' ? '· click Dart 1' : '· click Dart 2') : ''}</div>
      <div className="quick-grid">
        {SCORES.map(v => (
          <button
            key={v}
            className={`qs${v === 0 ? ' qs-miss' : ''}${v === 10 ? ' qs-max' : ''}`}
            onClick={() => quickScore(v)}
            disabled={disabled}
            id={`qs-${v}`}
            title={`Score ${v}${v === 0 ? ' (miss)' : ''}`}
          >
            {v}
            <span className="qs-key">{v === 10 ? '0' : v === 0 ? 'M' : v}</span>
          </button>
        ))}
      </div>
      <div className="kbd-hint">Keyboard: 1–9 = score, 0 = 10, M/` = miss · Enter = confirm</div>
    </div>
  )
}
