import type { FocusSession, RecurrenceException, Task } from '../types'
import { materializeOccurrence } from './task'

export type FocusHistoryRecord = {
  id: string
  kind: 'task' | 'direct'
  title: string
  seconds: number
  tagIds: string[]
  task?: Task
  session?: FocusSession
}

export function activeFocusSession(sessions: FocusSession[]) {
  return sessions.find(session => !session.endedAt) ?? null
}

export function focusTiming(session: FocusSession | null, nowMs: number, maxFocusSeconds: number) {
  if (!session) return { elapsedSeconds: 0, remainingSeconds: 0, dueAtMs: null as number | null }
  const startMs = new Date(session.startedAt).getTime()
  if (!Number.isFinite(startMs)) return { elapsedSeconds: 0, remainingSeconds: 0, dueAtMs: null as number | null }
  const safeMax = Math.max(0, maxFocusSeconds)
  const elapsedSeconds = Math.min(safeMax, Math.max(0, Math.floor((nowMs - startMs) / 1000)))
  const countdownSeconds = session.mode === 'countdown' ? Math.max(0, session.plannedSeconds ?? 0) : null
  const remainingSeconds = countdownSeconds === null ? 0 : Math.max(0, countdownSeconds - elapsedSeconds)
  const capDue = startMs + safeMax * 1000
  const countdownDue = countdownSeconds === null ? Number.POSITIVE_INFINITY : startMs + countdownSeconds * 1000
  return { elapsedSeconds, remainingSeconds, dueAtMs: Math.min(capDue, countdownDue) }
}

export function formatFocusClock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  const h = Math.floor(safe / 3600), m = Math.floor((safe % 3600) / 60), sec = safe % 60
  return h > 0
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function finishedFocusSession(session: FocusSession, endMs: number) {
  const startMs = new Date(session.startedAt).getTime()
  const safeEnd = Number.isFinite(startMs) ? Math.max(startMs, endMs) : endMs
  const endedAt = new Date(safeEnd).toISOString()
  const durationSeconds = Number.isFinite(startMs) ? Math.max(0, Math.round((safeEnd - startMs) / 1000)) : 0
  return { ...session, endedAt, durationSeconds, updatedAt: endedAt }
}

export function focusHistoryForDate(tasks: Task[], sessions: FocusSession[], dateKey: string, nowMs: number): FocusHistoryRecord[] {
  const rows: FocusHistoryRecord[] = []
  tasks.forEach(task => {
    if (task.trashedAt) return
    if (!task.recurrence) {
      const seconds = Math.max(0, Number(task.actualDurationMinutes ?? 0) * 60)
      if (task.date === dateKey && seconds > 0) rows.push({ id: `task:${task.id}`, kind: 'task', title: task.title, seconds, tagIds: task.tagIds ?? [], task })
      return
    }
    const exception = task.recurrenceExceptions?.[dateKey] as RecurrenceException | undefined
    if (!exception || exception.deleted || exception.trashedAt) return
    const seconds = Math.max(0, Number(exception.actualDurationMinutes ?? 0) * 60)
    if (seconds <= 0) return
    const occurrence = materializeOccurrence(task, dateKey)
    if (occurrence) rows.push({ id: `task:${task.id}:${dateKey}`, kind: 'task', title: occurrence.title, seconds, tagIds: occurrence.tagIds ?? [], task: occurrence })
  })

  const dayStart = new Date(`${dateKey}T00:00:00`).getTime()
  const dayEnd = new Date(`${dateKey}T23:59:59.999`).getTime() + 1
  sessions.forEach(session => {
    const start = new Date(session.startedAt).getTime()
    if (!Number.isFinite(start)) return
    const rawEnd = session.endedAt ? new Date(session.endedAt).getTime() : nowMs
    const plannedEnd = session.mode === 'countdown' && session.plannedSeconds ? start + session.plannedSeconds * 1000 : rawEnd
    const end = Math.min(rawEnd, plannedEnd)
    const overlap = Math.max(0, Math.min(end, dayEnd) - Math.max(start, dayStart))
    if (overlap > 0) rows.push({ id: `direct:${session.id}`, kind: 'direct', title: '自由专注', seconds: Math.round(overlap / 1000), tagIds: session.tagIds, session })
  })
  return rows.sort((a, b) => (b.session?.startedAt ?? '').localeCompare(a.session?.startedAt ?? ''))
}
