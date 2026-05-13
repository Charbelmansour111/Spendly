import { Navigate, useLocation } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'

export default function WalletGuard({ children }) {
  const token = localStorage.getItem('token')
  const { activeWallet } = useWallet()
  const location = useLocation()

  if (!token) return <Navigate to="/login" replace />
  if (!activeWallet) return <Navigate to="/wallets" state={{ from: location }} replace />

  return children
}
