const SHELL_CACHE = 'spendly-shell-v2'
const DATA_CACHE  = 'spendly-data-v2'

const SHELL_URLS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png']

const CACHE_API = [
  '/api/expenses',
  '/api/income',
  '/api/budgets',
  '/api/savings',
  '/api/subscriptions',
  '/api/wellness',
  '/api/networth/items',
]

const SKIP_CACHE = ['/api/insights', '/api/news', '/api/receipts', '/api/ai']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL_CACHE).then(c => c.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== SHELL_CACHE && k !== DATA_CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Spendly', {
      body: data.body || '',
      icon: data.icon || '/icon-192.png',
      badge: data.badge || '/icon-192.png',
      tag: data.tag || 'spendly',
      data: { url: data.url || '/dashboard' },
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/dashboard';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); existing.navigate(url); }
      else clients.openWindow(url);
    })
  );
});

self.addEventListener('fetch', e => {
  const { request } = e
  const url = new URL(request.url)

  if (url.origin !== self.location.origin) return

  const path = url.pathname

  if (SKIP_CACHE.some(p => path.startsWith(p))) return

  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).catch(() => caches.match('/index.html')))
    return
  }

  if (CACHE_API.some(p => path.startsWith(p))) {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(DATA_CACHE).then(c => c.put(request, clone))
          }
          return res
        })
        .catch(() => caches.match(request).then(r => r || new Response(
          JSON.stringify([]),
          { headers: { 'Content-Type': 'application/json' } }
        )))
    )
    return
  }

  if (path.match(/\.(js|css|png|jpg|svg|ico|woff2?|ttf)$/)) {
    e.respondWith(
      caches.match(request).then(r => r || fetch(request).then(res => {
        const clone = res.clone()
        caches.open(SHELL_CACHE).then(c => c.put(request, clone))
        return res
      }))
    )
  }
})
