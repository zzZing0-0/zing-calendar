import { useEffect, useState } from 'react'
import { habitDateKey } from '../../domain/habitDay'

/** Refresh at local minute changes and after a suspended PWA returns to the foreground. */
export function useHabitToday(startTime: string) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const refresh = () => setNow(Date.now())
    const tick = () => { refresh(); timer = setTimeout(tick, 60000 - Date.now() % 60000) }
    timer = setTimeout(tick, 60000 - Date.now() % 60000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', refresh); window.removeEventListener('focus', refresh) }
  }, [])
  return habitDateKey(new Date(now), startTime)
}
