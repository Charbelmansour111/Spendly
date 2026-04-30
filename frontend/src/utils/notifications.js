const STORAGE_KEY = 'spendly_notif_enabled'
const LAST_NOTIF_KEY = 'spendly_last_notif'

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
