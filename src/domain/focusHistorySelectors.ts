import type { FocusSession, Note, Task } from '../types'
import { noteFocusSeconds, taskFocusSeconds } from './focus'

/** Return immutable, newest-first visible sessions for a single context. */
export function focusSessionsForContext(sessions: FocusSession[], kind: 'task' | 'note', id: string | null | undefined): FocusSession[] {
  if (!id) return []
  return sessions.filter(session => {
    if (session.trashedAt || !session.context) return false
    if (kind === 'task') return session.context.kind === 'task' && session.context.taskId === id
    return session.context.kind === 'note' && session.context.noteId === id
  })
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

export function focusHistoryForNote(noteId: string | null, notes: Note[], sessions: FocusSession[], nowMs: number) {
  return {
    note: noteId ? notes.find(note => note.id === noteId && !note.trashedAt) ?? null : null,
    sessions: focusSessionsForContext(sessions, 'note', noteId),
    seconds: noteId ? noteFocusSeconds(noteId, sessions, nowMs) : 0,
  }
}

export function focusHistoryForTask(task: Task | null | undefined, sessions: FocusSession[], nowMs: number) {
  const id = task && !task.seriesId ? task.id : null
  return {
    sessions: focusSessionsForContext(sessions, 'task', id),
    seconds: id ? taskFocusSeconds(id, sessions, nowMs) : 0,
  }
}

/** Preserve the existing local datetime editor's minute-level representation. */
export function focusIsoToLocalInput(iso: string): string {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function focusLocalInputToDate(value: string): Date | null {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}
