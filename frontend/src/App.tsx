import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import WalletConnect from './components/WalletConnect'
import DashboardPage from './pages/DashboardPage'
import { useWallet } from './hooks/useWallet'

function AppRoutes() {
  const { address } = useWallet()
  return (
    <Routes>
      <Route path="/" element={address ? <Navigate to="/dashboard" replace /> : <WalletConnect />} />
      <Route path="/dashboard" element={address ? <DashboardPage /> : <Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster position="top-right" theme="dark" richColors />
    </BrowserRouter>
  )
}
