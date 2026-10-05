import { expect, test } from '@playwright/test'
import { planSyncDiff, rowSyncId, syncEntityKey } from '../../src/domain/sync'

test.describe('sync domain regression', () => {
  test('date-keyed entities use date identity while ordinary entities use id', () => {
    expect(rowSyncId('mood', { date: '2026-10-04', id: 'ignored' })).toBe('2026-10-04')
    expect(rowSyncId('task', { id: 'task-1', date: '2026-10-04' })).toBe('task-1')
    expect(syncEntityKey('journal', 'j-1')).toBe('journal:j-1')
  })

  test('diff planning emits only changed upserts and real deletions', () => {
    const previous = [{ id: 'a', title: 'same' }, { id: 'b', title: 'old' }, { id: 'c', title: 'gone' }]
    const next = [{ id: 'a', title: 'same' }, { id: 'b', title: 'new' }, { id: 'd', title: 'added' }]
    expect(planSyncDiff('task', previous, next)).toEqual([
      { entityType: 'task', entityId: 'b', operation: 'upsert' },
      { entityType: 'task', entityId: 'd', operation: 'upsert' },
      { entityType: 'task', entityId: 'c', operation: 'delete' },
    ])
  })

  test('trashing a focus session syncs as an upsert rather than a deletion', () => {
    const previous = [{ id: 'focus-1', updatedAt: '2026-10-04T10:00:00.000Z' }]
    const next = [{ id: 'focus-1', updatedAt: '2026-10-04T11:00:00.000Z', trashedAt: '2026-10-04T11:00:00.000Z' }]
    expect(planSyncDiff('focus', previous, next)).toEqual([
      { entityType: 'focus', entityId: 'focus-1', operation: 'upsert' },
    ])
  })

  test('date-keyed rows do not create false delete-plus-add operations', () => {
    expect(planSyncDiff('energy', [{ date: '2026-10-04', level: 2 }], [{ date: '2026-10-04', level: 4 }])).toEqual([
      { entityType: 'energy', entityId: '2026-10-04', operation: 'upsert' },
    ])
  })
})
