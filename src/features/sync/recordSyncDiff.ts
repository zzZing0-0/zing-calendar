import type { SyncEntityType } from '../../db/calendar'
import { appendSyncChange, getOrCreateDeviceId, saveSyncTombstone } from '../../db/calendar'
import { planSyncDiff, syncEntityKey } from '../../domain/sync'
export async function recordSyncDiff(entityType: SyncEntityType, previousRows: any[], nextRows: any[]) {
  const operations = planSyncDiff(entityType, previousRows, nextRows)
  if (!operations.length) return false
  const deviceId = getOrCreateDeviceId()
  const now = new Date().toISOString()
  for (const operation of operations) {
    if (operation.operation === 'delete') {
      await saveSyncTombstone({ key: syncEntityKey(entityType, operation.entityId), entityType, entityId: operation.entityId, deletedAt: now, deviceId })
    }
    await appendSyncChange({ ...operation, changedAt: now, deviceId })
  }
  return true
}
