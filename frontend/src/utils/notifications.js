const STORAGE_KEY = 'spendly_notif_enabled'
const VAPID_PUBLIC_KEY = 'BH0cwQ-D5FPAwRtR_WOKDzmVdSLFDPPZzsCgnuKqLuh2CoGu9R5V93w3xm2BcF5AyuJ0LJip89-nvI_adpqhcmI'

// Spendly signature chime
export function playSpendlyChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const master = ctx.createGain()
    master.gain.value = 0.55
    master.connect(ctx.destination)
    const notes = [523.25, 659.25, 783.99]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(master)
      osc.type = 'sine'; osc.frequency.value = freq
      const t0 = ctx.currentTime + i * 0.155
      gain.gain.setValueAtTime(0, t0)
      gain.gain.linearRampToValueAtTime(0.6, t0 + 0.018)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.38)
      osc.start(t0); osc.stop(t0 + 0.42)
    })
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.connect(gain2); gain2.connect(master)
    osc2.type = 'triangle'
    const t1 = ctx.currentTime + 0.52
    osc2.frequency.setValueAtTime(1047, t1)
    osc2.frequency.exponentialRampToValueAtTime(523, t1 + 0.38)
    gain2.gain.setValueAtTime(0, t1)
    gain2.gain.linearRampToValueAtTime(0.5, t1 + 0.02)
    gain2.gain.exponentialRampToValueAtTime(0.001, t1 + 0.42)
    osc2.start(t1); osc2.stop(t1 + 0.46)
    setTimeout(() => { try { ctx.close() } catch { /* closed */ } }, 1400)
  } catch { /* AudioContext not available */ }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export function isNotificationsEnabled() {
  return localStorage.getItem(STORAGE_KEY) === 'true' && Notification.permission === 'granted'
}

export function disableNotifications() {
  localStorage.removeItem(STORAGE_KEY)
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'denied') return false
  const result = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission()
  if (result !== 'granted') return false
  localStorage.setItem(STORAGE_KEY, 'true')
  await subscribeToPush()
  return true
}

export async function subscribeToPush() {
  try {
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    const sub = existing || await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
    const token = localStorage.getItem('token')
    if (!token) return
    await fetch('https://spendly-backend-et20.onrender.com/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ subscription: sub }),
    })
  } catch { /* push not supported or blocked */ }
}

export async function unsubscribeFromPush() {
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) await sub.unsubscribe()
    const token = localStorage.getItem('token')
    if (!token) return
    await fetch('https://spendly-backend-et20.onrender.com/api/push/unsubscribe', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    })
  } catch { /* noop */ }
}

// Keep for backward compat — no longer needed with push
export function scheduleReminders() {}
