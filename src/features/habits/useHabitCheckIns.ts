import type { Dispatch, SetStateAction } from 'react'
import { toDateKey } from '../../domain/task'
import type { Habit, HabitCheckIn } from './habitDomain'

/** Callers pass either the calculated habit day or a user's explicit calendar selection. */
export function useHabitCheckIns(setCheckIns: Dispatch<SetStateAction<HabitCheckIn[]>>) {
  const quickHabitCheckIn = (habit: Habit, date: string) => {
    if (habit.archivedAt || habit.deletedAt || !date || date > toDateKey(new Date())) return
    const now = new Date().toISOString()
    setCheckIns(rows => [...rows, { id: crypto.randomUUID(), habitId: habit.id, occurredDate: date, quantity: habit.quantityTarget, createdAt: now, updatedAt: now }])
  }
  const undoHabitCheckIn = (habit: Habit, date: string) => {
    if (habit.archivedAt || habit.deletedAt) return
    setCheckIns(rows => {
      const row = [...rows].reverse().find(r => r.habitId === habit.id && r.occurredDate === date && !r.deletedAt)
      if (!row) return rows
      const now = new Date().toISOString()
      return rows.map(r => r.id === row.id ? { ...r, deletedAt: now, updatedAt: now } : r)
    })
  }
  return { quickHabitCheckIn, undoHabitCheckIn }
}
