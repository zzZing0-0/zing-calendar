import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './styles/components.css'
import './styles/sorting.css'
import './styles/focus-card.css'
import { prepareSettingsCache } from './features/application/settingsCache'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element #root was not found')
}

void prepareSettingsCache().then(() => {
  createRoot(rootElement).render(<StrictMode><App /></StrictMode>)
}).catch(() => {
  // Do not mount stale preference/data persistence effects on an incomplete cache.
  rootElement.textContent = '无法安全读取本地设置。请检查浏览器存储空间后刷新；已保存的数据未被修改。'
})

// Keep the app shell available offline. The service worker owns program
// caching only; IndexedDB remains the source of truth for local user data.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline registration/update failures must never block local app use.
    })
  })
}

import './styles/task-focus-history.css'
