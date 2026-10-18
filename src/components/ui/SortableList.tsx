import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Button } from './Button'

/** Reorder only on the handle. Touch requires a hold so list scrolling stays available. */
export function SortableList<T extends string>({ items, label, onChange }: {
  items: readonly T[]
  label: (item: T) => string
  onChange: (next: T[]) => void
}) {
  const [active, setActive] = useState<T | null>(null)
  const drag = useRef<{ key: T; pointerId: number; startX: number; startY: number; ready: boolean; timer?: ReturnType<typeof setTimeout> } | null>(null)
  const current = useRef(items)
  current.current = items
  const stop = () => {
    if (drag.current?.timer) clearTimeout(drag.current.timer)
    drag.current = null
    setActive(null)
  }
  useEffect(() => () => { if (drag.current?.timer) clearTimeout(drag.current.timer) }, [])
  const reorder = (source: T, target: T, after = false) => {
    const next = [...current.current]
    const from = next.indexOf(source)
    const to = next.indexOf(target)
    if (from < 0 || to < 0 || from === to) return
    next.splice(from, 1)
    next.splice(next.indexOf(target) + (after ? 1 : 0), 0, source)
    current.current = next
    onChange(next)
  }
  const start = (event: ReactPointerEvent<HTMLButtonElement>, key: T) => {
    if (event.button !== 0) return
    stop()
    const state = { key, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, ready: event.pointerType === 'mouse', timer: undefined as ReturnType<typeof setTimeout> | undefined }
    drag.current = state
    if (state.ready) setActive(key)
    else state.timer = setTimeout(() => { if (drag.current === state) { state.ready = true; setActive(key) } }, 280)
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const move = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    if (!state.ready) {
      if (Math.hypot(event.clientX - state.startX, event.clientY - state.startY) > 9) stop()
      return
    }
    const row = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-sort-index]')
    const targetIndex = Number(row?.dataset.sortIndex)
    if (!row || !Number.isInteger(targetIndex)) return
    const target = current.current[targetIndex]
    if (target === undefined || target === state.key) return
    const sourceIndex = current.current.indexOf(state.key)
    reorder(state.key, target, sourceIndex < targetIndex)
  }
  return <div className="shared-sort-list" role="list" aria-label="拖动排序列表">
    {items.map((item, index) => <div className={`shared-sort-row${active === item ? ' is-dragging' : ''}`} key={item} data-sort-index={index} role="listitem">
      <Button className="shared-sort-handle" type="button" aria-label={`拖动${label(item)}排序`} title="拖动排序；键盘方向键可调整顺序"
        onPointerDown={event => start(event, item)} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}
        onKeyDown={event => {
          if (event.key === 'ArrowUp' && index > 0) { event.preventDefault(); reorder(item, items[index - 1]) }
          if (event.key === 'ArrowDown' && index < items.length - 1) { event.preventDefault(); reorder(item, items[index + 1], true) }
        }}><span aria-hidden="true">⠿</span></Button>
      <strong>{label(item)}</strong>
    </div>)}
  </div>
}
