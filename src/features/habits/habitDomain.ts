/** Habit facts are immutable in meaning: scheduled goals never manufacture check-ins. */
export type HabitSchedule =
  | { kind: 'flexible'; period: 'day' | 'week' | 'month'; times: number }
  | { kind: 'fixed'; weekdays: number[] }
  | { kind: 'free' }

export type Habit = {
  id: string
  name: string
  icon?: string
  schedule: HabitSchedule
  quantityTarget: number
  unit: string
  tagId?: string
  createdAt: string
  updatedAt: string
  archivedAt?: string
  deletedAt?: string
}

export type HabitCheckIn = {
  id: string
  habitId: string
  /** Local calendar day on which the activity actually happened. */
  occurredDate: string
  /** Optional actual time; never inferred from when a record was created. */
  occurredTime?: string
  quantity: number
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export function periodBounds(key: string, period: 'day' | 'week' | 'month'): [string, string] {
  if (period === 'day') return [key, key]
  const [y, m, d] = key.split('-').map(Number)
  const start = new Date(Date.UTC(y, m - 1, d))
  const format = (date: Date) => date.toISOString().slice(0, 10)
  if (period === 'week') {
    start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7)
    const end = new Date(start); end.setUTCDate(end.getUTCDate() + 6)
    return [format(start), format(end)]
  }
  return [format(new Date(Date.UTC(y, m - 1, 1))), format(new Date(Date.UTC(y, m, 0)))]
}

export function liveCheckIns(habitId: string, checkIns: HabitCheckIn[]): HabitCheckIn[] {
  return checkIns.filter(row => row.habitId === habitId && !row.deletedAt)
}

/** Count separate activities, never sum their quantity as frequency. */
export function progressForDate(habit: Habit, checkIns: HabitCheckIn[], key: string): { done: number; target: number | null; met: boolean } {
  const live = liveCheckIns(habit.id, checkIns)
  if (habit.schedule.kind === 'free') return { done: live.filter(row => row.occurredDate === key).length, target: null, met: false }
  if (habit.schedule.kind === 'fixed') {
    const done = live.filter(row => row.occurredDate === key && row.quantity >= habit.quantityTarget).length
    return { done, target: habit.schedule.weekdays.includes(dayNumber(key)) ? 1 : null, met: done > 0 }
  }
  const [start, end] = periodBounds(key, habit.schedule.period)
  const done = live.filter(row => row.occurredDate >= start && row.occurredDate <= end && row.quantity >= habit.quantityTarget).length
  return { done, target: habit.schedule.times, met: done >= habit.schedule.times }
}

/** Daily details only show scheduled, still-needed habits and actually logged habits. */
export function visibleOnDay(habit: Habit, checkIns: HabitCheckIn[], key: string, today: string): boolean {
  if (habit.deletedAt || key > today || key < habit.createdAt.slice(0, 10)) return false
  // Archiving stops future prompts, but never conceals actual historical check-ins.
  if (liveCheckIns(habit.id, checkIns).some(row => row.occurredDate === key)) return true
  if (habit.archivedAt) return false
  if (habit.schedule.kind === 'free') return false
  if (habit.schedule.kind === 'fixed') return habit.schedule.weekdays.includes(dayNumber(key))
  // Flexible weekly/monthly goals are suggested today, not on every past date.
  return key === today && !progressForDate(habit, checkIns, key).met
}

export function orderedDailyHabits(habits: Habit[], checkIns: HabitCheckIn[], key: string, today: string): Habit[] {
  return habits.filter(habit => visibleOnDay(habit, checkIns, key, today))
    .sort((a, b) => Number(progressForDate(a, checkIns, key).met) - Number(progressForDate(b, checkIns, key).met))
}

/** Tombstones win against stale check-ins; later updates may explicitly recreate a record. */
export function mergeHabitCheckIns(local: HabitCheckIn[], remote: HabitCheckIn[]): HabitCheckIn[] {
  const merged = new Map<string, HabitCheckIn>()
  for (const row of [...local, ...remote]) {
    const previous = merged.get(row.id)
    if (!previous || row.updatedAt > previous.updatedAt || (row.updatedAt === previous.updatedAt && !!row.deletedAt && !previous.deletedAt)) merged.set(row.id, row)
  }
  return [...merged.values()]
}
