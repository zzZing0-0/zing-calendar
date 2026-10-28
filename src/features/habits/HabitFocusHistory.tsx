import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { focusSessionDurationSeconds } from '../../domain/focus'
import { formatFocusDuration } from '../../domain/task'
import type { FocusSession } from '../../types'

export const HABIT_FOCUS_HISTORY_PAGE_SIZE = 20

export function paginateHabitFocusHistory<T extends { startedAt: string }>(sessions: T[], requestedPage: number) {
  const ordered = [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  const totalPages = Math.max(1, Math.ceil(ordered.length / HABIT_FOCUS_HISTORY_PAGE_SIZE))
  const page = Math.max(0, Math.min(Math.trunc(Number.isFinite(requestedPage) ? requestedPage : 0), totalPages - 1))
  return { totalPages, page, total: ordered.length, visible: ordered.slice(page * HABIT_FOCUS_HISTORY_PAGE_SIZE, (page + 1) * HABIT_FOCUS_HISTORY_PAGE_SIZE) }
}

export function HabitFocusHistory({ sessions, now, formatUiDate, onBack, onEdit, onTrash }: {
  sessions: FocusSession[]
  now: number
  formatUiDate: (date: Date) => string
  onBack: () => void
  onEdit: (session: FocusSession) => void
  onTrash: (session: FocusSession) => void
}) {
  const [page, setPage] = useState(0)
  const { totalPages, page: safePage, visible, total } = paginateHabitFocusHistory(sessions, page)
  return <section className="habit-focus-history-view" aria-label="习惯专注历史">
    <div className="habit-focus-history-toolbar"><Button type="button" onClick={onBack}>‹ 返回完成日历</Button><span>共 {total} 条记录</span></div>
    {visible.length === 0 ? <p>还没有专注记录</p> : <div className="habit-focus-history">{visible.map(session => <div className="habit-focus-history-row" key={session.id}>
      <span>{formatUiDate(new Date(session.startedAt))} · {formatFocusDuration(focusSessionDurationSeconds(session, now))}{!session.endedAt ? ' · 进行中' : ''}</span>
      <div><Button type="button" disabled={!session.endedAt} onClick={() => onEdit(session)}>更改</Button><Button type="button" disabled={!session.endedAt} onClick={() => onTrash(session)}>删除</Button></div>
    </div>)}</div>}
    {totalPages > 1 && <nav className="habit-focus-history-pages" aria-label="专注历史分页">
      <Button type="button" disabled={safePage === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>上一页</Button>
      <span>{safePage + 1} / {totalPages}</span>
      <Button type="button" disabled={safePage >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}>下一页</Button>
    </nav>}
  </section>
}
