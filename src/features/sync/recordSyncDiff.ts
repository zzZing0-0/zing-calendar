import type { SyncEntityType } from '../../db/calendar'
import { saveEntityWithSync } from '../../db/calendar'

/** Compatibility adapter. Never split entity persistence from deletion logging.
 * Previous UI snapshots are not authoritative; the transaction reads durable rows.
 */
export async function recordSyncDiff(entityType: SyncEntityType, _previousRows: any[], nextRows: any[]) {
  return saveEntityWithSync(entityType, nextRows)
}
