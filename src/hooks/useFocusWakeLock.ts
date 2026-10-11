import { useEffect, useRef } from 'react'

type WakeLockSentinel = { release: () => Promise<void> }
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> } }

export function useFocusWakeLock(shouldStayAwake: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    let cancelled = false
    const releaseWakeLock = async () => {
      const current = wakeLockRef.current
      wakeLockRef.current = null
      if (current) {
        try { await current.release() } catch { /* already released by the browser */ }
      }
    }
    const requestWakeLock = async () => {
      if (!shouldStayAwake || document.visibilityState !== 'visible' || wakeLockRef.current) return
      const wakeLock = (navigator as WakeLockNavigator).wakeLock
      if (!wakeLock) return
      try {
        const sentinel = await wakeLock.request('screen')
        if (cancelled || !shouldStayAwake) { await sentinel.release(); return }
        wakeLockRef.current = sentinel
      } catch (error) {
        console.info('Screen Wake Lock unavailable', error)
      }
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void requestWakeLock()
      else void releaseWakeLock()
    }
    if (shouldStayAwake) {
      void requestWakeLock()
      document.addEventListener('visibilitychange', onVisibilityChange)
    } else {
      void releaseWakeLock()
    }
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      void releaseWakeLock()
    }
  }, [shouldStayAwake])
}
