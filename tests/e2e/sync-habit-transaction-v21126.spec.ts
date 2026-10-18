import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const source = readFileSync('src/db/calendar.ts', 'utf8')

test('merge transaction includes every entity store used by its upserts and tombstones', () => {
  const mapping = source.match(/function entityStoreName\([\s\S]*?\n}/)?.[0] ?? ''
  const merge = source.match(/export async function applySyncMerge\([\s\S]*?\n}/)?.[0] ?? ''
  expect(mapping).toContain("entityType === 'habit'")
  expect(mapping).toContain("entityType === 'habitCheckIn'")
  expect(merge).toContain('tx.objectStore(entityStoreName(record.entityType))')
  expect(merge).toContain('tx.objectStore(entityStoreName(tombstone.entityType))')
  const stores = merge.match(/const stores = \[([^\]]+)\]/)?.[1] ?? ''
  expect(stores).toContain('HABIT_STORE')
  expect(stores).toContain('HABIT_CHECKIN_STORE')
  const mappedStores = [...mapping.matchAll(/return ([A-Z_]+_STORE)/g)].map(match => match[1])
  for (const store of mappedStores) expect(stores, `Missing transaction scope: ${store}`).toContain(store)
})
