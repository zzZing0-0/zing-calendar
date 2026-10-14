import type { FocusSession, Note, Task } from '../types'


export const COUNTDOWN_MIN_MINUTES = 1
export const COUNTDOWN_MAX_MINUTES = 12 * 60


export function focusSessionEndMs(session: FocusSession, nowMs: number) {
  const startMs = new Date(session.startedAt).getTime()
  if (!Number.isFinite(startMs)) return nowMs
  if (session.endedAt) {
    const endedMs = new Date(session.endedAt).getTime()
    return Number.isFinite(endedMs) ? Math.max(startMs, endedMs) : startMs
  }
  if (session.mode === 'countdown' && session.plannedSeconds) {
    return Math.min(nowMs, startMs + session.plannedSeconds * 1000)
  }
  return Math.max(startMs, nowMs)
}

export function focusSessionDurationSeconds(session: FocusSession, nowMs: number) {
  const startMs = new Date(session.startedAt).getTime()
  if (!Number.isFinite(startMs)) return 0
  return Math.max(0, Math.round((focusSessionEndMs(session, nowMs) - startMs) / 1000))
}

export function boundedInteger(value: string | number, min: number, max: number, fallback = min) {
  const parsed = typeof value === 'number' ? Math.trunc(value) : Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return Math.min(max, Math.max(min, fallback))
  return Math.min(max, Math.max(min, parsed))
}

export function countdownMinutes(value: string | number, fallback = 15) {
  return boundedInteger(value, COUNTDOWN_MIN_MINUTES, COUNTDOWN_MAX_MINUTES, fallback)
}

export type FocusHistoryRecord = {
  id: string
  kind: 'task' | 'note' | 'direct'
  title: string
  seconds: number
  tagIds: string[]
  task?: Task
  note?: Note
  session?: FocusSession
}

export function activeFocusSession(sessions: FocusSession[]) {
  return sessions.find(session => !session.trashedAt && !session.endedAt) ?? null
}

export function trashFocusSession(session: FocusSession, trashedAt: string) {
  return { ...session, trashedAt, updatedAt: trashedAt }
}

export function restoreFocusSession(session: FocusSession, restoredAt: string) {
  return { ...session, trashedAt: undefined, updatedAt: restoredAt }
}

export function activeFocusSessions(sessions: FocusSession[]) {
  return sessions.filter(session => !session.trashedAt)
}

export function permanentlyDeleteFocusSession(sessions: FocusSession[], id: string) {
  return sessions.filter(session => session.id !== id)
}

export function purgeTrashedFocusSessions(sessions: FocusSession[]) {
  return sessions.filter(session => !session.trashedAt)
}

export function focusTiming(session: FocusSession | null, nowMs: number, maxFocusSeconds: number) {
  if (!session) return { elapsedSeconds: 0, remainingSeconds: 0, dueAtMs: null as number | null }
  const startMs = new Date(session.startedAt).getTime()
  if (!Number.isFinite(startMs)) return { elapsedSeconds: 0, remainingSeconds: 0, dueAtMs: null as number | null }
  const elapsedRaw = Math.max(0, Math.floor((nowMs - startMs) / 1000))
  if (session.mode === 'countdown') {
    const plannedSeconds = Math.max(0, session.plannedSeconds ?? 0)
    return {
      elapsedSeconds: Math.min(plannedSeconds, elapsedRaw),
      remainingSeconds: Math.max(0, plannedSeconds - elapsedRaw),
      dueAtMs: startMs + plannedSeconds * 1000,
    }
  }
  const safeMax = Math.max(0, maxFocusSeconds)
  return {
    elapsedSeconds: Math.min(safeMax, elapsedRaw),
    remainingSeconds: 0,
    dueAtMs: startMs + safeMax * 1000,
  }
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

export function taskFocusSeconds(taskId: string, sessions: FocusSession[], nowMs: number) {
  return sessions.filter(session => !session.trashedAt && session.context?.kind === 'task' && session.context.taskId === taskId)
    .reduce((sum, session) => {
      const start = new Date(session.startedAt).getTime()
      if (!Number.isFinite(start)) return sum
      const end = focusSessionEndMs(session, nowMs)
      return sum + Math.max(0, Math.round((end - start) / 1000))
    }, 0)
}

export function noteFocusSeconds(noteId: string, sessions: FocusSession[], nowMs: number) {
  return sessions.filter(session => !session.trashedAt && session.context?.kind === 'note' && session.context.noteId === noteId)
    .reduce((sum, session) => {
      const start = new Date(session.startedAt).getTime()
      if (!Number.isFinite(start)) return sum
      const end = focusSessionEndMs(session, nowMs)
      return sum + Math.max(0, Math.round((end - start) / 1000))
    }, 0)
}

export function focusHistoryForDate(tasks: Task[], notes: Note[], sessions: FocusSession[], dateKey: string, nowMs: number): FocusHistoryRecord[] {
  const dayStart = new Date(`${dateKey}T00:00:00`).getTime()
  const dayEnd = new Date(`${dateKey}T23:59:59.999`).getTime() + 1
  const taskMap = new Map(tasks.filter(task=>!task.trashedAt&&!task.recurrence).map(task=>[task.id,task]))
  const taskRows = new Map<string, FocusHistoryRecord>()
  const noteMap = new Map(notes.filter(note=>!note.trashedAt).map(note=>[note.id,note]))
  const noteRows = new Map<string, FocusHistoryRecord>()
  const directRows: FocusHistoryRecord[] = []
  sessions.forEach(session => {
    if (session.trashedAt) return
    const start = new Date(session.startedAt).getTime()
    if (!Number.isFinite(start)) return
    const end = focusSessionEndMs(session, nowMs)
    const overlap = Math.max(0, Math.min(end, dayEnd) - Math.max(start, dayStart))
    if (overlap <= 0) return
    const seconds = Math.round(overlap / 1000)
    if (session.context?.kind === 'task') {
      const task = taskMap.get(session.context.taskId)
      if (!task) return
      const existing = taskRows.get(session.context.taskId)
      if (existing) { existing.seconds += seconds; return }
      taskRows.set(session.context.taskId, { id:`task:${session.context.taskId}`, kind:'task', title:task.title, seconds, tagIds:session.tagIds, task, session })
      return
    }
    if (session.context?.kind === 'note') {
      const note = noteMap.get(session.context.noteId)
      if (!note) return
      const ordinaryTagIds = session.tagIds.filter(Boolean).slice().sort()
      const key = `${session.context.noteId}:${ordinaryTagIds.join(',')}`
      const existing = noteRows.get(key)
      if (existing) { existing.seconds += seconds; return }
      noteRows.set(key, { id:`note:${key}`, kind:'note', title:note.title, seconds, tagIds:session.tagIds, note })
      return
    }
    directRows.push({ id:`direct:${session.id}`, kind:'direct', title:'自由专注', seconds, tagIds:session.tagIds, session })
  })
  return [...taskRows.values(), ...noteRows.values(), ...directRows].sort((a,b)=>(b.session?.startedAt??'').localeCompare(a.session?.startedAt??''))
}
