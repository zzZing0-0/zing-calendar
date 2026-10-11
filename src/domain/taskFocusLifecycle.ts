import type { FocusSession, Task } from '../types'

export function cascadeTrashTaskFocus(sessions: FocusSession[], taskId: string, trashedAt: string) {
  return sessions.map(session => {
    if (session.trashedAt || session.context?.kind !== 'task' || session.context.taskId !== taskId) return session
    return { ...session, trashedAt, trashedByTaskId: taskId, updatedAt: trashedAt }
  })
}

export function cascadeRestoreTaskFocus(sessions: FocusSession[], taskId: string, restoredAt: string) {
  return sessions.map(session => {
    if (session.trashedByTaskId !== taskId || session.context?.kind !== 'task' || session.context.taskId !== taskId) return session
    const { trashedAt: _trashedAt, trashedByTaskId: _trashedByTaskId, ...rest } = session
    return { ...rest, updatedAt: restoredAt }
  })
}

export function permanentlyDeleteTaskFocus(sessions: FocusSession[], taskId: string) {
  return sessions.filter(session => session.context?.kind !== 'task' || session.context.taskId !== taskId)
}

export function purgeTrashWithTaskFocus(sessions: FocusSession[], tasks: Task[]) {
  const trashedTaskIds = new Set(tasks.filter(task => task.trashedAt).map(task => task.id))
  return sessions.filter(session => {
    if (session.trashedAt) return false
    return session.context?.kind !== 'task' || !trashedTaskIds.has(session.context.taskId)
  })
}

// Backward-compatible export for existing Task lifecycle callers/tests; the implementation now covers all Focus contexts.
export { focusSessionParticipatesInStats } from './focusContextLifecycle'
