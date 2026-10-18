import { expect, test } from '@playwright/test'
import { makeZip, readZingZip, parseBackupEntries } from '../../src/domain/backup'

const enc = new TextEncoder()
const zip = (entries: {path:string;bytes:Uint8Array}[]) => new File([makeZip(entries)], 'backup.zip')

test('ZIP detects modified content even when the byte count is unchanged', async () => {
  const bytes = new Uint8Array(await zip([{path:'manifest.json',bytes:enc.encode('hello')}]).arrayBuffer())
  const index = bytes.findIndex((v,i) => i > 30 && v === 104)
  expect(index).toBeGreaterThan(30)
  bytes[index] = 72
  await expect(readZingZip(new File([bytes], 'bad.zip'))).rejects.toThrow('CRC32')
})

test('ZIP rejects truncated central directory', async () => {
  const bytes = new Uint8Array(await zip([{path:'manifest.json',bytes:enc.encode('{}')}]).arrayBuffer())
  await expect(readZingZip(new File([bytes.slice(0,-10)],'bad.zip'))).rejects.toThrow()
})

test('ZIP rejects duplicate paths before a backup can be restored', async () => {
  await expect(readZingZip(zip([{path:'manifest.json',bytes:enc.encode('{}')},{path:'manifest.json',bytes:enc.encode('{}')}]))).rejects.toThrow('重复文件')
})

test('ZIP rejects path traversal entries', async () => {
  await expect(readZingZip(zip([{path:'../settings.json',bytes:enc.encode('{}')}]))).rejects.toThrow('不安全')
})

test('backup parser rejects non-object settings and malformed rows', () => {
  const entries = new Map<string,Uint8Array>([
    ['manifest.json',enc.encode(JSON.stringify({format:'zing-calendar-backup',schemaVersion:1,counts:{},attachments:[]}))],
    ...['tasks','journals','moods','tags','anniversaries'].map(name=>[`data/${name}.json`,enc.encode(name==='tasks'?'[null]':'[]')] as [string,Uint8Array]),
    ['data/settings.json',enc.encode('[]')],
  ])
  expect(()=>parseBackupEntries(entries)).toThrow('备份设置格式错误')
  entries.set('data/settings.json',enc.encode('{}'))
  expect(()=>parseBackupEntries(entries)).toThrow('备份记录格式错误')
})
