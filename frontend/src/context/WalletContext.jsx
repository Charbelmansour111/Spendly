import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { getActiveWallet, setActiveWallet as persistWallet, clearActiveWallet, fetchWallets } from '../utils/walletSession'

const WalletContext = createContext(null)

export function WalletProvider({ children }) {
  const [wallets, setWallets] = useState([])
  const [activeWallet, setActiveWalletState] = useState(() => getActiveWallet())
  const [loading, setLoading] = useState(false)

  const refreshWallets = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    setLoading(true)
    try {
      const list = await fetchWallets(token)
      setWallets(list)
    } catch (_e) { /* network error */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (localStorage.getItem('token')) refreshWallets()
  }, [refreshWallets])

  function activateWallet(wallet, rememberDays = 0) {
    persistWallet(wallet, rememberDays)
    setActiveWalletState(wallet)
  }

  function deactivateWallet() {
    clearActiveWallet()
    setActiveWalletState(null)
  }

  return (
    <WalletContext.Provider value={{ wallets, activeWallet, loading, refreshWallets, activateWallet, deactivateWallet }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider')
  return ctx
}
