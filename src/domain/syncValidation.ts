import type { SyncBundle, SyncEntityRecord, SyncTombstone } from '../db/calendar'
import { validateBackupSettings } from './backupValidation'

export const SYNC_ENTITY_TYPES = ['task', 'journal', 'note', 'notebook', 'mood', 'energy', 'environment', 'period', 'tag', 'anniversary', 'focus', 'habit', 'habitCheckIn', 'settings'] as const
const validType = (value: unknown) => typeof value === 'string' && (SYNC_ENTITY_TYPES as readonly string[]).includes(value)
const validId = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const validStamp = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value))

export function validateSyncRows(records: SyncEntityRecord[], tombstones: SyncTombstone[]) {
  if (!Array.isArray(records) || !Array.isArray(tombstones)) throw new Error('同步数据缺少记录或删除标记')
  const seen = new Set<string>()
  for (const record of records) {
    if (!record || !validType(record.entityType) || !validId(record.entityId) || !validStamp(record.updatedAt)) throw new Error('同步记录类型、标识或时间无效')
    const payload = record.payload
    const field = ['mood', 'energy', 'environment'].includes(record.entityType) ? 'date' : 'id'
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) || payload[field] !== record.entityId) throw new Error('同步记录与数据标识不一致')
    if (record.entityType === 'settings') validateBackupSettings(payload)
    const key = `${record.entityType}:${record.entityId}`
    if (seen.has(key)) throw new Error('同步记录标识重复')
    seen.add(key)
  }
  const deleted = new Set<string>()
  for (const row of tombstones) {
    if (!row || !validType(row.entityType) || !validId(row.entityId) || row.key !== `${row.entityType}:${row.entityId}` || !validStamp(row.deletedAt)) throw new Error('同步删除标记无效')
    if (deleted.has(row.key)) throw new Error('同步删除标记重复')
    deleted.add(row.key)
  }
}

export function validateSyncBundle(value: unknown): asserts value is SyncBundle {
  if (!value || typeof value !== 'object' || (value as SyncBundle).protocolVersion !== 1) throw new Error('不支持的同步协议版本')
  const bundle = value as SyncBundle
  validateSyncRows(bundle.records, bundle.tombstones)
}
