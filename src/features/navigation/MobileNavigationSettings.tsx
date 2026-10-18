import type { PointerEvent as ReactPointerEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { mobileNavIcon, mobileNavLabel } from './MobileNavigation'
import type { MobileNavChoice, MobileNavConfig } from './navigationConfig'
import { missingMobileNav, moveMobileNav } from './navigationConfig'

type Area = 'shown' | 'hidden'
type Target = { area: Area; index: number }

export function MobileNavigationSettings({ config, onChange, onSaveDefault, onRestoreDefault, onClose, status }: {
  config: MobileNavConfig
  onChange: (next: MobileNavConfig) => void
  onSaveDefault: () => void
  onRestoreDefault: () => void
  onClose: () => void
  status: string
}) {
  const [dragging, setDragging] = useState<MobileNavChoice | null>(null)
  const [over, setOver] = useState<Target | null>(null)
  const drag = useRef<{ id: MobileNavChoice; startX: number; startY: number; ready: boolean; timer?: ReturnType<typeof setTimeout> } | null>(null)
  const overRef = useRef<Target | null>(null)
  const cancel = () => { if (drag.current?.timer) clearTimeout(drag.current.timer); drag.current = null; overRef.current = null; setDragging(null); setOver(null) }
  useEffect(() => () => { if (drag.current?.timer) clearTimeout(drag.current.timer) }, [])

  const targetAt = (x: number, y: number): Target | null => {
    const element = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-nav-area]')
    if (!element) return null
    const area = element.dataset.navArea as Area
    if (area !== 'shown' && area !== 'hidden') return null
    const row = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-nav-index]')
    if (row && row.dataset.navArea === area) {
      const rect = row.getBoundingClientRect()
      return { area, index: Number(row.dataset.navIndex) + (y > rect.top + rect.height / 2 ? 1 : 0) }
    }
    return { area, index: area === 'shown' ? config.middleItems.length : missingMobileNav(config).length }
  }
  const updateTarget = (x: number, y: number) => {
    const target = targetAt(x, y)
    overRef.current = target
    setOver(target)
  }
  const commit = (id: MobileNavChoice, target: Target | null) => {
    if (target) onChange(moveMobileNav(config, id, target.area, target.index))
    cancel()
  }
  const startPointer = (event: ReactPointerEvent<HTMLButtonElement>, id: MobileNavChoice) => {
    if (event.button !== 0) return
    cancel()
    const state = { id, startX: event.clientX, startY: event.clientY, ready: event.pointerType === 'mouse', timer: undefined as ReturnType<typeof setTimeout> | undefined }
    drag.current = state
    if (event.pointerType !== 'mouse') state.timer = setTimeout(() => { if (drag.current === state) { state.ready = true; setDragging(id); navigator.vibrate?.(12) } }, 280)
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const movePointer = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const state = drag.current
    if (!state) return
    if (!state.ready) {
      if (Math.hypot(event.clientX - state.startX, event.clientY - state.startY) > 9) cancel()
      return
    }
    if (!dragging) setDragging(state.id)
    updateTarget(event.clientX, event.clientY)
  }
  const finishPointer = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const state = drag.current
    if (state?.ready) commit(state.id, targetAt(event.clientX, event.clientY) ?? overRef.current)
    else cancel()
  }

  const rows = (area: Area, ids: MobileNavChoice[]) => <div className={`mobile-nav-dropzone ${over?.area === area ? 'drop-active' : ''}`} data-nav-area={area} aria-label={area === 'shown' ? '底部显示' : '不显示'}>
    {ids.map((id, index) => <div key={id} data-nav-area={area} data-nav-index={index} className={`mobile-nav-sort-row ${dragging === id ? 'dragging' : ''} ${over?.area === area && over.index === index ? 'drop-before' : ''}`}>
      <Button className="mobile-nav-drag-handle" type="button" aria-label={`拖动${mobileNavLabel(id)}`} onPointerDown={event => startPointer(event, id)} onPointerMove={movePointer} onPointerUp={finishPointer} onPointerCancel={cancel} onLostPointerCapture={cancel}><span aria-hidden="true">⠿</span></Button>
      {mobileNavIcon(id)}<span>{mobileNavLabel(id)}</span>

    </div>)}
    {over?.area === area && over.index === ids.length && <div className="mobile-nav-drop-end" />}
    {ids.length === 0 && <div className="mobile-nav-empty">拖动项目到这里</div>}
  </div>

  return <div className="mobile-nav-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className="mobile-nav-panel" role="dialog" aria-modal="true" aria-label="导航栏设置">
      <header><h3>导航栏设置</h3><Button type="button" onClick={onClose} aria-label="关闭导航栏设置">×</Button></header>
      <p className="mobile-nav-help">长按左侧把手拖动排序，或拖到另一栏调整显示位置。底部最多显示 5 项。</p>
      <div className="mobile-nav-section-title"><strong>底部显示</strong><span>{config.middleItems.length + 2} / 5</span></div>
      <div className="mobile-nav-fixed-row">{mobileNavIcon('calendar')}<span>日历</span><small>固定首位</small></div>
      {rows('shown', config.middleItems)}
      <div className="mobile-nav-fixed-row">{mobileNavIcon('settings')}<span>设置</span><small>固定末位</small></div>
      <div className="mobile-nav-section-title"><strong>不显示</strong><span>按此顺序显示在设置页</span></div>
      {rows('hidden', missingMobileNav(config))}
      <Button className="mobile-nav-default-action" type="button" onClick={onSaveDefault}>将当前导航设置为默认</Button>
      <Button className="mobile-nav-restore-action" type="button" onClick={onRestoreDefault}>恢复默认导航</Button>
      {status && <p role="status">{status}</p>}
    </section>
  </div>
}
