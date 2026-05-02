const STORAGE_KEY = 'spendly_notif_enabled'
const LAST_NOTIF_KEY = 'spendly_last_notif'

// Spendly signature chime — C5→E5→G5 chord sweep + descending coin finish
export function playSpendlyChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const master = ctx.createGain()
    master.gain.value = 0.55
    master.connect(ctx.destination)

    // Three rising notes: C5, E5, G5
    const notes = [523.25, 659.25, 783.99]
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(master)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t0 = ctx.currentTime + i * 0.155
      gain.gain.setValueAtTime(0, t0)
      gain.gain.linearRampToValueAtTime(0.6, t0 + 0.018)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.38)
      osc.start(t0); osc.stop(t0 + 0.42)
    })

    // Descending "coin drop" finish using triangle wave
    const osc2  = ctx.createOscillator()
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

    setTimeout(() => { try { ctx.close() } catch {} }, 1400)
  } catch { /* AudioContext not available */ }
}

const PROMPTS = [
  "💸 Hey! Don't forget to log today's expenses.",
  "📊 Keep your budget on track — log your spending!",
  "🛒 Did you spend anything today? Log it in Spendly!",
  "☕ Had a coffee or lunch today? Add it to Spendly!",
  "💡 Quick reminder: log your expenses to stay on budget.",
  "🎯 Stay on target — track what you spent today!",
  "📱 2 minutes to log today's expenses. Future-you will thank you!",
  "🏦 Your wallet called — it wants to be tracked. Log your expenses!",
]

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') {
    localStorage.setItem(STORAGE_KEY, 'true')
    return true
  }
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  const granted = result === 'granted'
  if (granted) localStorage.setItem(STORAGE_KEY, 'true')
  return granted
}

export function isNotificationsEnabled() {
  return localStorage.getItem(STORAGE_KEY) === 'true' && Notification.permission === 'granted'
}

export function disableNotifications() {
  localStorage.removeItem(STORAGE_KEY)
}

export function sendExpenseReminder() {
  if (!isNotificationsEnabled()) return
  const msg = PROMPTS[Math.floor(Math.random() * PROMPTS.length)]
  playSpendlyChime()
  new Notification('Spendly', {
    body: msg,
    icon: '/vite.svg',
    badge: '/vite.svg',
    tag: 'expense-reminder',
  })
  localStorage.setItem(LAST_NOTIF_KEY, Date.now().toString())
}

export function scheduleReminders() {
  if (!isNotificationsEnabled()) return

  const INTERVAL_HOURS = 8
  const intervalMs = INTERVAL_HOURS * 60 * 60 * 1000

  const lastSent = parseInt(localStorage.getItem(LAST_NOTIF_KEY) || '0')
  const now = Date.now()
  const nextMs = Math.max(0, (lastSent + intervalMs) - now)

  const send = () => {
    sendExpenseReminder()
    setInterval(sendExpenseReminder, intervalMs)
  }

  if (nextMs === 0) {
    send()
  } else {
    setTimeout(send, nextMs)
  }
}
