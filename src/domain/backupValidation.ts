import type { JournalEntry, Note, Task } from '../types'
import { referencedAttachmentKeys } from './attachments'

/** Validate fields the restore coordinator dereferences before any destructive write. */
export function validateBackupSettings(settings: Record<string, unknown>) {
  for (const name of ['showEndedTasks','showAllRecurringTasks','excludeDefaultFocusStats','keepScreenAwakeDuringFocus']) {
    if (settings[name] !== undefined && typeof settings[name] !== 'boolean') throw new Error(`备份设置字段无效：${name}`)
  }
  for (const [name, values] of Object.entries({ dateFormat:['dmy','mdy'], weekStart:['monday','sunday'], encouragementStyle:['random','dark','light'] })) {
    if (settings[name] !== undefined && !values.includes(settings[name] as string)) throw new Error(`备份设置字段无效：${name}`)
  }
  for (const name of ['greeting']) if (settings[name] !== undefined && typeof settings[name] !== 'string') throw new Error(`备份设置字段无效：${name}`)
  for (const name of ['defaultPriority','maxFocusHours']) if (settings[name] !== undefined && (typeof settings[name] !== 'number' || !Number.isFinite(settings[name]))) throw new Error(`备份设置字段无效：${name}`)
  if (settings.wordCloudIgnored !== undefined && (!Array.isArray(settings.wordCloudIgnored) || settings.wordCloudIgnored.some(word=>typeof word !== 'string'))) throw new Error('备份屏蔽词格式错误')
  for (const name of ['encouragementMessages','weatherOptions','thermalOptions','emotionOptions','randomPoolGroups','randomPoolItems']) {
    if (settings[name] !== undefined && (!Array.isArray(settings[name]) || (settings[name] as unknown[]).some(row=>!row || typeof row !== 'object' || Array.isArray(row)))) throw new Error(`备份设置字段无效：${name}`)
  }
  for (const name of ['mixedPoolItemIds','modulePriority','daySectionOrder','settingsGroupOrder']) {
    if (settings[name] !== undefined && (!Array.isArray(settings[name]) || (settings[name] as unknown[]).some(value=>typeof value !== 'string'))) throw new Error(`备份设置字段无效：${name}`)
  }
}

export function validateBackupAttachmentReferences(tasks: Task[], journals: JournalEntry[], notes: Note[], keys: Set<string>) {
  for (const record of [...tasks,...journals,...notes]) {
    const groups = [record.attachments, ...Object.values((record as Task).recurrenceExceptions ?? {}).map(row=>row.attachments)]
    for (const group of groups) {
      if (group === undefined) continue
      if (!Array.isArray(group) || group.some(row=>!row || typeof row.storageKey !== 'string' || !row.storageKey)) throw new Error('备份附件引用格式错误')
    }
  }
  for (const key of referencedAttachmentKeys(tasks,journals,notes)) if (!keys.has(key)) throw new Error(`备份缺少被引用的附件：${key}`)
}
