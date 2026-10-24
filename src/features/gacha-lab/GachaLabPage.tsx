import { lazy, Suspense, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../../components/ui/Button'
import { PageHeading } from '../../components/ui/PageHeading'
import { APP_VERSION } from '../application/version'
import { GachaLabBoundary } from './GachaLabBoundary'
const GachaLabContent = lazy(() => import('./GachaLabContent').then(module => ({ default: module.GachaLabContent })))
import './gacha-lab.css'

/** Host navigation stays mounted even when the native feature cannot render. */
export function GachaLabPage({ onClose }: { onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => {
    const previous = document.body.style.overflow, focused = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'; close.current?.focus()
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current() }
    document.addEventListener('keydown', escape)
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', escape); focused?.focus({ preventScroll: true }) }
  }, [])
  return createPortal(<div className="gacha-lab-overlay" role="dialog" aria-modal="true" aria-label="抽奖模拟器">
    <div className="gacha-lab-toolbar"><Button ref={close} onClick={onClose} aria-label="返回日历">‹ 返回</Button><PageHeading title="抽奖模拟器"/><span>v{APP_VERSION}</span></div>
    <div className="gacha-lab-content"><GachaLabBoundary onClose={onClose}><Suspense fallback={<div className="gacha-lab-recovery" role="status">正在加载抽奖模拟器…<Button onClick={onClose}>返回日历</Button></div>}><GachaLabContent/></Suspense></GachaLabBoundary></div>
  </div>, document.body)
}
