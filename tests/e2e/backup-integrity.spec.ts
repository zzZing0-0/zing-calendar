import { expect, test } from '@playwright/test'
import { makeZip, parseBackupEntries, readZingZip } from '../../src/domain/backup'

const encoder = new TextEncoder()
const json = (value: unknown) => encoder.encode(JSON.stringify(value))

function backupEntries(overrides: { manifest?: any; omit?: string[]; attachmentBytes?: Uint8Array } = {}) {
  const attachmentBytes = overrides.attachmentBytes ?? new Uint8Array([1, 2, 3, 4])
  const manifest = overrides.manifest ?? {
    format: 'zing-calendar-backup', schemaVersion: 1, appVersion: 'test', exportedAt: '2026-10-04T00:00:00.000Z',
    counts: { tasks: 1, journals: 1, moods: 1, energies: 1, environments: 1, periods: 1, tags: 1, anniversaries: 1, focusSessions: 1, attachments: 1 },
    attachments: [{ storageKey: 'blob:1', path: 'attachments/0001-photo.png', filename: 'photo.png', mimeType: 'image/png', size: attachmentBytes.length, type: 'image', createdAt: '2026-10-04T00:00:00.000Z' }],
  }
  const rows: [string, Uint8Array][] = [
    ['manifest.json', json(manifest)],
    ['data/tasks.json', json([{ id: 't1', title: 'Task' }])],
    ['data/journals.json', json([{ id: 'j1', title: 'Journal' }])],
    ['data/moods.json', json([{ date: '2026-10-04', value: 2 }])],
    ['data/energy.json', json([{ date: '2026-10-04', level: 3 }])],
    ['data/environment.json', json([{ date: '2026-10-04', weatherId: 'sunny' }])],
    ['data/periods.json', json([{ id: 'p1', startDate: '2026-10-01' }])],
    ['data/tags.json', json([{ id: 'default', name: '默认' }])],
    ['data/anniversaries.json', json([{ id: 'a1', title: 'Anniversary' }])],
    ['data/focus.json', json([{ id: 'f1', startedAt: '2026-10-04T01:00:00.000Z' }])],
    ['data/settings.json', json({ greeting: 'Hello, Zing', maxFocusHours: 2 })],
    ['attachments/0001-photo.png', attachmentBytes],
  ]
  const omit = new Set(overrides.omit ?? [])
  return new Map(rows.filter(([path]) => !omit.has(path)))
}

test.describe('backup integrity regression', () => {
  test('complete backup validates every data family and preserves attachment bytes', () => {
    const parsed = parseBackupEntries(backupEntries())
    expect(parsed.tasks).toHaveLength(1)
    expect(parsed.journals).toHaveLength(1)
    expect(parsed.focusSessions).toHaveLength(1)
    expect(parsed.settings.greeting).toBe('Hello, Zing')
    expect([...parsed.attachments[0].bytes]).toEqual([1, 2, 3, 4])
  })

  test('backup ZIP round-trip remains parseable as a full backup', async () => {
    const entries = [...backupEntries()].map(([path, bytes]) => ({ path, bytes }))
    const file = new File([makeZip(entries)], 'full-backup.zip', { type: 'application/zip' })
    const parsed = parseBackupEntries(await readZingZip(file))
    expect(parsed.manifest.schemaVersion).toBe(1)
    expect(parsed.attachments[0].filename).toBe('photo.png')
  })

  test('wrong format or schema is rejected before restore', () => {
    expect(() => parseBackupEntries(backupEntries({ manifest: { format: 'other', schemaVersion: 1 } }))).toThrow('这不是可识别的 Zing Backup v1')
    expect(() => parseBackupEntries(backupEntries({ manifest: { format: 'zing-calendar-backup', schemaVersion: 2 } }))).toThrow('这不是可识别的 Zing Backup v1')
  })

  test('missing required JSON data is rejected explicitly', () => {
    expect(() => parseBackupEntries(backupEntries({ omit: ['data/tasks.json'] }))).toThrow('缺少 data/tasks.json')
    expect(() => parseBackupEntries(backupEntries({ omit: ['data/settings.json'] }))).toThrow('缺少 data/settings.json')
  })

  test('legacy optional energy/environment/period/focus files restore as empty arrays', () => {
    const entries = backupEntries({ omit: ['data/energy.json', 'data/environment.json', 'data/periods.json', 'data/focus.json'] })
    const manifest = JSON.parse(new TextDecoder().decode(entries.get('manifest.json')!))
    delete manifest.counts.energies; delete manifest.counts.environments; delete manifest.counts.periods; delete manifest.counts.focusSessions
    entries.set('manifest.json', json(manifest))
    const parsed = parseBackupEntries(entries)
    expect(parsed.energies).toEqual([])
    expect(parsed.environments).toEqual([])
    expect(parsed.periods).toEqual([])
    expect(parsed.focusSessions).toEqual([])
  })

  test('manifest count mismatch is rejected instead of silently restoring partial data', () => {
    const entries = backupEntries()
    const manifest = JSON.parse(new TextDecoder().decode(entries.get('manifest.json')!))
    manifest.counts.tasks = 2
    entries.set('manifest.json', json(manifest))
    expect(() => parseBackupEntries(entries)).toThrow('备份数量校验失败')
  })

  test('missing or size-mismatched attachment is rejected', () => {
    expect(() => parseBackupEntries(backupEntries({ omit: ['attachments/0001-photo.png'] }))).toThrow('缺少附件')
    const entries = backupEntries()
    const manifest = JSON.parse(new TextDecoder().decode(entries.get('manifest.json')!))
    manifest.attachments[0].size = 999
    entries.set('manifest.json', json(manifest))
    expect(() => parseBackupEntries(entries)).toThrow('附件大小不一致')
  })
})

test('golden backup fixture preserves rich Unicode, multiline, recurrence, settings and binary payloads exactly', async () => {
  const bytes = new Uint8Array([0, 255, 1, 128, 42, 10])
  const entries = backupEntries({ attachmentBytes: bytes })
  const manifest = JSON.parse(new TextDecoder().decode(entries.get('manifest.json')!))
  const task = { id:'gold-task', title:'跨日任务 🐱', date:'2026-10-04', endDate:'2026-10-06', priority:3, status:'completed', allDay:false, time:'08:05', deadline:'2026-10-05T23:59', notes:'第一行\n☑ 已完成\n逗号, 引号" emoji 🌈', createdAt:'2026-10-01T00:00:00.000Z', updatedAt:'2026-10-04T12:00:00.000Z', completedAt:'2026-10-04T12:00:00.000Z', tagIds:['default','custom'], recurrence:{unit:'week',interval:2,weekdays:[1,4],end:{type:'count',count:8}}, attachments:[manifest.attachments[0]], attachmentLinkTombstones:{'old:blob':'2026-10-03T00:00:00.000Z'} }
  const journal = { id:'gold-journal', date:'2026-10-04', time:'22:15', title:'夜间记录 🐈', content:'# Markdown\n中文 / English\n特殊字符 <> &', impact:-2, createdAt:'2026-10-04T14:00:00.000Z', updatedAt:'2026-10-04T14:01:00.000Z', tagIds:['default','custom'], attachments:[manifest.attachments[0]] }
  const settings = { greeting:'Hello, Zing 🐱', weekStart:'monday', dateFormat:'dmy', defaultPriority:2, showEndedTasks:false, showAllRecurringTasks:false, excludeDefaultFocusStats:true, wordCloudIgnored:['the','医学'], maxFocusHours:12, encouragementStyle:'light' }
  entries.set('data/tasks.json', json([task])); entries.set('data/journals.json', json([journal])); entries.set('data/settings.json', json(settings))
  const file = new File([makeZip([...entries].map(([path, payload])=>({path,bytes:payload})))], 'golden.zip', {type:'application/zip'})
  const parsed = parseBackupEntries(await readZingZip(file))
  expect(parsed.tasks[0]).toEqual(task)
  expect(parsed.journals[0]).toEqual(journal)
  expect(parsed.settings).toEqual(settings)
  expect([...parsed.attachments[0].bytes]).toEqual([...bytes])
})
