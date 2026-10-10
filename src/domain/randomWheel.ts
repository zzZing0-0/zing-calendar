import type { RandomPoolGroup, RandomPoolItem } from '../types'

export function validRandomItems(items: RandomPoolItem[], groupId: string) {
  return items.filter(item => item.groupId === groupId && item.enabled && Number.isFinite(item.weight) && item.weight > 0 && item.name.trim())
}

export function groupHasWheel(items: RandomPoolItem[], groupId: string) {
  return validRandomItems(items, groupId).length >= 2
}

export function availableWheelGroups(groups: RandomPoolGroup[], items: RandomPoolItem[]) {
  return groups.filter(group => groupHasWheel(items, group.id))
}

export function cryptoUnit(randomValues: (array: Uint32Array<ArrayBuffer>) => void = array => { crypto.getRandomValues(array) }) {
  const array = new Uint32Array<ArrayBuffer>(new ArrayBuffer(Uint32Array.BYTES_PER_ELEMENT))
  randomValues(array)
  return array[0] / 0x100000000
}

export function chooseWeightedItem(items: RandomPoolItem[], groupId: string, unit: number) {
  const valid = validRandomItems(items, groupId)
  if (!valid.length) return null
  const total = valid.reduce((sum, item) => sum + item.weight, 0)
  const target = Math.min(Math.max(unit, 0), 0.9999999999999999) * total
  let cumulative = 0
  for (const item of valid) {
    cumulative += item.weight
    if (target < cumulative) return item
  }
  return valid[valid.length - 1]
}

export function sanitizeRandomGroups(value: unknown): RandomPoolGroup[] {
  if (!Array.isArray(value)) return []
  return value.filter(row => row && typeof row.id === 'string' && typeof row.name === 'string' && row.name.trim()).map(row => ({...row, name:row.name.trim()}))
}

export function sanitizeRandomItems(value: unknown): RandomPoolItem[] {
  if (!Array.isArray(value)) return []
  return value.filter(row => row && typeof row.id === 'string' && typeof row.groupId === 'string' && typeof row.name === 'string' && row.name.trim()).map(row => ({
    ...row, name:row.name.trim(), amount:typeof row.amount === 'number' && Number.isFinite(row.amount) ? row.amount : undefined,
    unit:typeof row.unit === 'string' ? row.unit.trim() : undefined, weight:typeof row.weight === 'number' && Number.isFinite(row.weight) ? row.weight : 1,
    enabled:row.enabled !== false,
  }))
}
