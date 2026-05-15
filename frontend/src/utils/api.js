import axios from 'axios'
import { getActiveWallet } from './walletSession'

const BASE = 'https://spendly-backend-et20.onrender.com/api'

const WALLET_REWRITES = [
  '/expenses',
  '/income',
  '/budgets',
  '/savings',
  '/debts',
  '/subscriptions',
]

function rewriteForWallet(url, walletId) {
  if (!walletId || !url) return url
  for (const prefix of WALLET_REWRITES) {
    if (url === prefix || url.startsWith(prefix + '/') || url.startsWith(prefix + '?')) {
      return url.replace(prefix, `/wallets/${walletId}${prefix}`)
    }
  }
  return url
}

const API = axios.create({ baseURL: BASE })

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`

  const wallet = getActiveWallet()
  if (wallet?.id) {
    config.url = rewriteForWallet(config.url, wallet.id)
  }

  return config
})

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.setItem('fina_session_msg', 'Your session expired. Please log in again.')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default API
