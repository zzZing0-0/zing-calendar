import type { FocusSession } from '../types'

export function cascadeTrashHabitFocus(sessions: FocusSession[], habitId: string, trashedAt: string): FocusSession[] {
  return sessions.map(session => session.trashedAt || session.context?.kind !== 'habit' || session.context.habitId !== habitId
    ? session : { ...session, trashedAt, trashedByHabitId: habitId, updatedAt: trashedAt })
}

export function cascadeRestoreHabitFocus(sessions: FocusSession[], habitId: string, restoredAt: string): FocusSession[] {
  return sessions.map(session => {
    if (session.trashedByHabitId !== habitId || session.context?.kind !== 'habit' || session.context.habitId !== habitId) return session
    const { trashedAt: _trashedAt, trashedByHabitId: _trashedByHabitId, ...rest } = session
    return { ...rest, updatedAt: restoredAt }
  })
}

export function permanentlyDeleteHabitFocus(sessions: FocusSession[], habitId: string): FocusSession[] {
  return sessions.filter(session => session.context?.kind !== 'habit' || session.context.habitId !== habitId)
}

export function purgeTrashWithHabitFocus(sessions: FocusSession[], habits: { id: string; deletedAt?: string }[]): FocusSession[] {
  const deletedIds = new Set(habits.filter(habit => habit.deletedAt).map(habit => habit.id))
  return sessions.filter(session => !session.trashedAt && (session.context?.kind !== 'habit' || !deletedIds.has(session.context.habitId)))
}
