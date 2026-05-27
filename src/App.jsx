import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Header from './components/Header'
import Home from './pages/Home'
import Admin from './pages/Admin'
import MatchHistory from './pages/MatchHistory'
import MatchDetail from './pages/MatchDetail'
import Leaderboard from './pages/Leaderboard'
import PlayerProfile from './pages/PlayerProfile'
import { AudioProvider } from './context/AudioContext'

export default function App() {
  return (
    <AuthProvider>
      <AudioProvider>
        <BrowserRouter>
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/history" element={<MatchHistory />} />
            <Route path="/history/:matchId" element={<MatchDetail />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/player/:playerId" element={<PlayerProfile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </BrowserRouter>
      </AudioProvider>
    </AuthProvider>
  )
}
