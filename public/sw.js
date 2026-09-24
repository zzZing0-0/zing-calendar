const CACHE_NAME = 'zing-calendar-app-v1.4.0'
const APP_SHELL = '/'

async function fetchAndCacheAppShell() {
  const cache = await caches.open(CACHE_NAME)
  const response = await fetch(APP_SHELL, { cache: 'no-store', credentials: 'same-origin' })
  if (!response.ok) throw new Error(`App shell fetch failed: ${response.status}`)

  const html = await response.clone().text()
  await cache.put(APP_SHELL, response.clone())

  const urls = new Set([APP_SHELL])
  const assetPattern = /(?:src|href)=["']([^"']+)["']/g
  let match
  while ((match = assetPattern.exec(html))) {
    try {
      const url = new URL(match[1], self.location.origin)
      if (url.origin === self.location.origin) urls.add(url.pathname + url.search)
    } catch {
      // Ignore malformed/non-URL attributes.
    }
  }

  const assets = [...urls].filter(url => url !== APP_SHELL)
  await Promise.all(assets.map(async url => {
    try {
      const assetResponse = await fetch(url, { cache: 'no-store', credentials: 'same-origin' })
      if (assetResponse.ok) await cache.put(url, assetResponse)
    } catch {
      // One optional asset must not make the whole offline shell fail.
    }
  }))
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    await fetchAndCacheAppShell()
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys()
    await Promise.all(
      names
        .filter(name => name.startsWith('zing-calendar-app-') && name !== CACHE_NAME)
        .map(name => caches.delete(name))
    )
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request, { cache: 'no-store' })
        if (fresh.ok) {
          const cache = await caches.open(CACHE_NAME)
          await cache.put(APP_SHELL, fresh.clone())
        }
        return fresh
      } catch {
        const cached = await caches.match(APP_SHELL)
        if (cached) return cached
        return Response.error()
      }
    })())
    return
  }

  event.respondWith((async () => {
    const cached = await caches.match(request)
    if (cached) return cached

    try {
      const fresh = await fetch(request)
      if (fresh.ok) {
        const cache = await caches.open(CACHE_NAME)
        await cache.put(request, fresh.clone())
      }
      return fresh
    } catch {
      return Response.error()
    }
  })())
})
