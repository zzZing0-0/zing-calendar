import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element #root was not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// GitHub Pages publishes hashed production assets. When an installed iPhone
// web app returns from the background, compare the currently loaded bundle
// with the latest index and refresh only when a newer deployment exists.
if (import.meta.env.PROD) {
  let checking = false

  const checkForUpdate = async () => {
    if (checking) return
    checking = true

    try {
      const response = await fetch(window.location.pathname, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (!response.ok) return

      const html = await response.text()
      const latest = html.match(/<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/i)?.[1]
      const current = document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.getAttribute('src')

      if (latest && current && latest !== current) {
        const refreshUrl = new URL(window.location.href)
        refreshUrl.searchParams.set('_update', Date.now().toString())
        window.location.replace(refreshUrl.toString())
      }
    } catch {
      // Offline or transient network failures should never block the app.
    } finally {
      checking = false
    }
  }

  window.addEventListener('pageshow', checkForUpdate)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForUpdate()
  })
}
