import type { FocusSession } from '../types'

export function cascadeTrashNoteFocus(sessions: FocusSession[], noteId: string, trashedAt: string) {
  return sessions.map(session => {
    if (session.trashedAt || session.context?.kind !== 'note' || session.context.noteId !== noteId) return session
    return { ...session, trashedAt, trashedByNoteId: noteId, updatedAt: trashedAt }
  })
}

export function cascadeRestoreNoteFocus(sessions: FocusSession[], noteId: string, restoredAt: string) {
  return sessions.map(session => {
    if (session.trashedByNoteId !== noteId || session.context?.kind !== 'note' || session.context.noteId !== noteId) return session
    const { trashedAt: _trashedAt, trashedByNoteId: _trashedByNoteId, ...rest } = session
    return { ...rest, updatedAt: restoredAt }
  })
}

export function permanentlyDeleteNoteFocus(sessions: FocusSession[], noteId: string) {
  return sessions.filter(session => session.context?.kind !== 'note' || session.context.noteId !== noteId)
}

export function purgeTrashWithNoteFocus(sessions: FocusSession[], notes: { id:string; trashedAt?:string }[]) {
  const trashedNoteIds = new Set(notes.filter(note => note.trashedAt).map(note => note.id))
  return sessions.filter(session => {
    if (session.trashedAt) return false
    return session.context?.kind !== 'note' || !trashedNoteIds.has(session.context.noteId)
  })
}
