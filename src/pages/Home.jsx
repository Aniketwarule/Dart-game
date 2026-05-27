import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import MatchView from './MatchView'

export default function Home() {
  const [activeMatch, setActiveMatch] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchActiveMatch() {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    setActiveMatch(data || null)
    setLoading(false)
  }

  useEffect(() => {
    fetchActiveMatch()

    // real-time: listen for match status changes
    const channel = supabase
      .channel('home-matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchActiveMatch()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  if (loading) {
    return (
      <div className="loading-center">
        <div className="spinner" />
        <span>Loading…</span>
      </div>
    )
  }

  if (!activeMatch) {
    return (
      <div className="home-wrap cyber-theme">
        <div className="cyber-grid" />
        <div className="cyber-scanline" />
        <div className="home-glow cyber-glow" />
        
        <div className="home-hero">
          <div className="cyber-target-icon">
            <div className="cyber-crosshair"></div>
          </div>
          <h1 className="glitch-text" data-text="DART BOARD">DART<br />BOARD</h1>
          <p className="cyber-subtitle">SYS.ON // LIVE.SCORE_TRACKING // SYNC: ACTIVE</p>
        </div>
        
        <div className="no-match-card cyber-card">
          <div className="cyber-card-glitch"></div>
          <div className="cyber-card-content">
            <div className="cyber-status-badge">WARNING // OFFLINE</div>
            <div className="no-match-title cyber-title">NO MATCH DETECTED</div>
            <div className="no-match-sub cyber-sub">
              &gt; THE ARENA IS CURRENTLY QUIET.<br />
              &gt; AWAITING ADMIN INITIALIZATION...<br />
              <span className="blink-cursor">_</span>
            </div>
            <div className="cyber-btn-group">
              <Link to="/history" className="btn cyber-btn">
                <span className="cyber-btn-glitch"></span>
                <span className="cyber-btn-text">[ ARCHIVE ]</span>
              </Link>
              <Link to="/leaderboard" className="btn cyber-btn">
                <span className="cyber-btn-glitch"></span>
                <span className="cyber-btn-text">[ STANDINGS ]</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <MatchView match={activeMatch} readOnly={true} />
}
