import { toDateKey } from './task'

export const isHabitDayStart = (value: unknown): value is string => typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
export const normalizeHabitDayStart = (value: unknown): string => isHabitDayStart(value) ? value : '00:00'

/** Local wall-clock boundary, using calendar subtraction (never subtract 24h across DST). */
export function habitDateKey(now: Date, startTime = '00:00'): string {
  const [hours, minutes] = normalizeHabitDayStart(startTime).split(':').map(Number)
  const day = new Date(now)
  if (now.getHours() * 60 + now.getMinutes() < hours * 60 + minutes) day.setDate(day.getDate() - 1)
  return toDateKey(day)
}

/** Only today's habit section follows the cutoff; explicitly browsed historic dates stay literal. */
export function habitDetailDate(selectedDate: string, naturalToday: string, habitToday: string) {
  return selectedDate === naturalToday ? habitToday : selectedDate
}
