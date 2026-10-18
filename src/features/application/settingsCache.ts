import { loadUserSettings } from '../../db/calendar'
import type { SyncedUserSettings } from '../../types'

/** A cache write must never turn a committed data restore into a failed restore. */
export function writeLocalCache(key: string, value: string): boolean {
  try { localStorage.setItem(key, value); return true } catch { return false }
}

/** IDB settings are authoritative. Replay them before mounting any React effects,
 * including after a process dies between the data commit and cache projection.
 * Legacy installs without a settings row keep their existing localStorage values.
 */
export async function prepareSettingsCache(storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): Promise<void> {
  const [settings] = await loadUserSettings<SyncedUserSettings>()
  if (!settings) return
  const jsonFields = new Set(['wordCloudIgnored','encouragementMessages','weatherOptions','thermalOptions','emotionOptions','randomPoolGroups','randomPoolItems','mixedPoolItemIds','modulePriority','daySectionOrder','settingsGroupOrder','defaultMobileNavigation'])
  const scalarFields = ['greeting','weekStart','dateFormat','defaultPriority','showEndedTasks','showAllRecurringTasks','excludeDefaultFocusStats','encouragementStyle','maxFocusHours','keepScreenAwakeDuringFocus']
  for (const field of [...scalarFields, ...jsonFields]) {
    const value = (settings as any)[field]
    if (value === undefined) continue
    const key = field === 'defaultMobileNavigation' ? 'zing:defaultMobileNavigation' : `zing:${field}`
    const text = jsonFields.has(field) ? JSON.stringify(value) : String(value)
    if (storage.getItem(key) !== text) storage.setItem(key, text)
  }
}
