import type { Habit } from './habitDomain'

/** Absent ranks retain the legacy array order; persisted ranks survive IDB key ordering. */
export function baseOrderedHabits(habits: Habit[]) {
  const original = new Map(habits.map((h, i) => [h.id, i]))
  return [...habits].sort((a, b) => (Number.isFinite(a.sortOrder) ? a.sortOrder! : original.get(a.id)!) - (Number.isFinite(b.sortOrder) ? b.sortOrder! : original.get(b.id)!) || original.get(a.id)! - original.get(b.id)!)
}

/** Reorder only selected group slots; preserve the base positions of the other group. */
export function reorderHabitGroup(habits: Habit[], orderedIds: string[], now: string): Habit[] {
  if (new Set(orderedIds).size !== orderedIds.length) return habits
  const active = baseOrderedHabits(habits.filter(h => !h.deletedAt && !h.archivedAt))
  const byId = new Map(active.map(h => [h.id, h]))
  if (orderedIds.some(id => !byId.has(id))) return habits
  const selected = new Set(orderedIds)
  let index = 0
  const order = active.map(h => selected.has(h.id) ? orderedIds[index++] : h.id)
  const ranks = new Map(order.map((id, i) => [id, i]))
  return habits.map(h => ranks.has(h.id) && h.sortOrder !== ranks.get(h.id) ? { ...h, sortOrder: ranks.get(h.id), updatedAt: now } : h)
}
