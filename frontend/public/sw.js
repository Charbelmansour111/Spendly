self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', async () => {
  const keys = await caches.keys()
  await Promise.all(keys.map(key => caches.delete(key)))
  self.clients.claim()
})
self.addEventListener('fetch', () => {})