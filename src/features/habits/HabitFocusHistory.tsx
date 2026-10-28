import { useEffect, useState } from 'react'
import { DialogHeader } from '../../components/ui/DialogHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { FocusHistorySummary } from '../../components/ui/FocusHistorySummary'
import type { Tag } from '../../types'
import { isImportSourceTagId } from '../../domain/preferences'
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

export function HabitFocusHistory({ title, sessions, tags, now, formatUiDate, onBack, onEdit, onTrash }: {
  title: string
  sessions: FocusSession[]
  tags: Tag[]
  now: number
  formatUiDate: (date: Date) => string
  onBack: () => void
  onEdit: (session: FocusSession) => void
  onTrash: (session: FocusSession) => void
}) {
  const [page, setPage] = useState(0)
  const { totalPages, page: safePage, visible, total } = paginateHabitFocusHistory(sessions, page)
  useEffect(() => { if (page !== safePage) setPage(safePage) }, [page, safePage])
  return <section className="habit-focus-history-view" aria-label="习惯专注历史">
    <DialogHeader title={`${title} · 专注历史`} eyebrow="HABIT FOCUS" actions={<Button className="task-focus-history-return" onClick={onBack}>‹ 返回完成日历</Button>} />
    <FocusHistorySummary duration={formatFocusDuration(sessions.reduce((sum, session) => sum + focusSessionDurationSeconds(session, now), 0))} count={total} />
    {visible.length === 0 ? <EmptyState className="page-empty compact">还没有专注记录</EmptyState> : <div className="focus-history-list">{visible.map(session => {
      const started = new Date(session.startedAt)
      const tag = session.tagIds.filter(id => !isImportSourceTagId(id)).map(id => tags.find(tag => tag.id === id)).find(Boolean)
      return <div className="focus-history-item" key={session.id}>
        <div className="focus-history-main"><strong className="focus-history-primary">{tag && <i style={{ background: tag.color }} />}{tag?.name ?? '默认'}</strong><div className="focus-history-meta"><span>{formatUiDate(started)} · {started.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><small>{formatFocusDuration(focusSessionDurationSeconds(session, now))}{!session.endedAt ? ' · 进行中' : ''}</small></div></div>
        <div className="focus-history-actions"><Button disabled={!session.endedAt} onClick={() => onEdit(session)}>更改</Button><Button variant="danger" className="danger" disabled={!session.endedAt} onClick={() => onTrash(session)}>删除</Button></div>
      </div>
    })}</div>}
    {totalPages > 1 && <nav className="habit-focus-history-pages" aria-label="专注历史分页">
      <Button type="button" disabled={safePage === 0} onClick={() => setPage(Math.max(0, safePage - 1))}>上一页</Button>
      <span>{safePage + 1} / {totalPages}</span>
      <Button type="button" disabled={safePage >= totalPages - 1} onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}>下一页</Button>
    </nav>}
  </section>
}
