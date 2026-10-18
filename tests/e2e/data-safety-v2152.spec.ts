import { expect, test } from '@playwright/test'
import { makeZip, parseBackupEntries, readZingZip } from '../../src/domain/backup'

const enc = new TextEncoder()
const json = (value: unknown) => enc.encode(JSON.stringify(value))
const baseline = () => new Map<string, Uint8Array>([
  ['manifest.json', json({ format:'zing-calendar-backup',schemaVersion:1,counts:{},attachments:[] })],
  ...['tasks','journals','moods','tags','anniversaries'].map(name => [`data/${name}.json`, json([])] as [string,Uint8Array]),
  ['data/settings.json',json({})],
])

test('restore validation rejects duplicate entity identifiers before writing data', () => {
  const entries = baseline()
  entries.set('data/tasks.json',json([{id:'same'},{id:'same'}]))
  expect(() => parseBackupEntries(entries)).toThrow('重复记录')
})

test('restore validation rejects missing record identifiers', () => {
  const entries = baseline()
  entries.set('data/tasks.json',json([{title:'invalid'}]))
  expect(() => parseBackupEntries(entries)).toThrow('缺少标识')
})

test('ZIP reader rejects invalid local header flags', async () => {
  const original = new Uint8Array(await makeZip([{path:'manifest.json',bytes:json({})}]).arrayBuffer())
  original[6] = 0x02
  await expect(readZingZip(new File([original],'bad.zip'))).rejects.toThrow('标志位')
})

test('external CSV imports register IDs while scanning a file to skip in-file duplicates', async () => {
  const { readFileSync } = await import('node:fs')
  const code = readFileSync('src/features/external-import/useExternalImport.ts','utf8')
  expect(code).toMatch(/if\(existingIds\.has\(id\)\)\{duplicateCount\+\+;return\}\s*existingIds\.add\(id\)/)
  expect(code).toMatch(/if\(existingIds\.has\(id\)\)\{ duplicateCount\+\+; return \}\s*existingIds\.add\(id\)/)
})
