import type { FocusSession, Note, Task } from '../types'

export function focusSessionParticipatesInStats(session: FocusSession, tasks: Task[], notes: Note[] = []) {
  if (session.trashedAt) return false
  const context = session.context
  if (!context) return true
  if (context.kind === 'task') {
    const task = tasks.find(row => row.id === context.taskId)
    return Boolean(task && !task.trashedAt)
  }
  if (context.kind === 'habit') return true // Habit archive/delete never silently destroys focus history.
  const note = notes.find(row => row.id === context.noteId)
  return Boolean(note && !note.trashedAt)
}
