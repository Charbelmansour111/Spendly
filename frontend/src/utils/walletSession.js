const SESSION_KEY = 'spendly_wallet_session'
const REMEMBER_KEY = 'spendly_wallet_remember'
const API = 'https://spendly-backend-et20.onrender.com/api'

function getDeviceFingerprint() {
  const nav = window.navigator
  const raw = [nav.userAgent, nav.language, screen.width, screen.height, new Date().getTimezoneOffset()].join('|')
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

export function getActiveWallet() {
  try {
    const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null')
    if (session) return session

    const remembered = JSON.parse(localStorage.getItem(REMEMBER_KEY) || 'null')
    if (remembered && remembered.expiresAt > Date.now()) return remembered.wallet
  } catch (_e) { /* corrupted storage */ }
  return null
}

export function setActiveWallet(wallet, rememberDays = 0) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(wallet))
  if (rememberDays > 0) {
    localStorage.setItem(REMEMBER_KEY, JSON.stringify({
      wallet,
      expiresAt: Date.now() + rememberDays * 24 * 60 * 60 * 1000,
    }))
  }
}

export function clearActiveWallet() {
  sessionStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(REMEMBER_KEY)
}

export function lockWallet() {
  sessionStorage.removeItem(SESSION_KEY)
}

export async function verifyWalletPin(walletId, pin, token) {
  const fp = getDeviceFingerprint()
  const res = await fetch(`${API}/wallets/${walletId}/verify-pin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-device-fp': fp,
    },
    body: JSON.stringify({ pin }),
  })
  const data = await res.json()
  return { ok: res.ok, ...data }
}

export async function fetchWallets(token) {
  const res = await fetch(`${API}/wallets`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch wallets')
  return res.json()
}

export async function createWallet(payload, token) {
  const res = await fetch(`${API}/wallets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to create wallet')
  return data
}

export async function updateWallet(walletId, payload, token) {
  const res = await fetch(`${API}/wallets/${walletId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Failed to update wallet')
  return data
}

export async function deleteWallet(walletId, token) {
  const res = await fetch(`${API}/wallets/${walletId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to delete wallet')
  return res.json()
}

export async function fetchFamilySummary(token) {
  const res = await fetch(`${API}/wallets/total/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch family summary')
  return res.json()
}
