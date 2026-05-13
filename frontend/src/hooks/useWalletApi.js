import { useMemo } from 'react'
import axios from 'axios'
import { useWallet } from '../context/WalletContext'

const BASE = 'https://spendly-backend-et20.onrender.com/api'

// Returns an axios-like object whose methods auto-route to
// /wallets/:id/<resource> when a wallet is active.
// Falls back to the global /api/<resource> if no wallet or for unknown paths.
export function useWalletApi() {
  const { activeWallet } = useWallet()

  return useMemo(() => {
    const walletId = activeWallet?.id

    function authHeaders() {
      const token = localStorage.getItem('token')
      return token ? { Authorization: `Bearer ${token}` } : {}
    }

    // Map a global path to a wallet-scoped path when we have a wallet
    function resolve(path) {
      if (!walletId) return path
      const rewrites = {
        '/expenses':      `/wallets/${walletId}/expenses`,
        '/income':        `/wallets/${walletId}/income`,
        '/budgets':       `/wallets/${walletId}/budgets`,
        '/savings':       `/wallets/${walletId}/savings`,
        '/debts':         `/wallets/${walletId}/debts`,
        '/subscriptions': `/wallets/${walletId}/subscriptions`,
      }
      for (const [prefix, replacement] of Object.entries(rewrites)) {
        if (path === prefix || path.startsWith(prefix + '/') || path.startsWith(prefix + '?')) {
          return path.replace(prefix, replacement)
        }
      }
      return path
    }

    const inst = axios.create({ baseURL: BASE })
    inst.interceptors.request.use(cfg => {
      const token = localStorage.getItem('token')
      if (token) cfg.headers.Authorization = `Bearer ${token}`
      cfg.url = resolve(cfg.url)
      return cfg
    })
    inst.interceptors.response.use(
      r => r,
      err => {
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.href = '/login'
        }
        return Promise.reject(err)
      }
    )
    return inst
  }, [activeWallet?.id])
}

export default useWalletApi
