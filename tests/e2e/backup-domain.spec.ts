import { expect, test } from '@playwright/test'
import { attachmentExtension, csvCell, decodeBackupJson, makeZip, readZingZip, safeBackupFilename } from '../../src/domain/backup'
import type { Attachment } from '../../src/types'

const attachment = (filename: string, mimeType: string, type: 'image'|'audio'): Attachment => ({
  id: 'a', type, filename, mimeType, size: 1, storageKey: 'k', createdAt: '2026-10-04T00:00:00.000Z',
})

test.describe('backup domain regression', () => {
  test('backup filename sanitization remains filesystem-safe and non-empty', () => {
    expect(safeBackupFilename('  a/b:c*?  d.jpg  ')).toBe('a_b_c_ d.jpg')
    expect(safeBackupFilename('///')).toBe('_')
  })

  test('attachment extension preserves explicit suffix before MIME fallback', () => {
    expect(attachmentExtension(attachment('Photo.JPEG', 'image/webp', 'image'))).toBe('.jpeg')
    expect(attachmentExtension(attachment('photo', 'image/webp', 'image'))).toBe('.webp')
    expect(attachmentExtension(attachment('voice', 'audio/webm', 'audio'))).toBe('.webm')
    expect(attachmentExtension(attachment('voice', 'audio/unknown', 'audio'))).toBe('.audio')
  })

  test('CSV export quoting preserves commas, quotes, nulls, and line breaks', () => {
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell(null)).toBe('""')
    expect(csvCell('a\nb')).toBe('"a\nb"')
  })

  test('stored ZIP writer and reader round-trip UTF-8 paths and bytes', async () => {
    const encoder = new TextEncoder()
    const blob = makeZip([
      { path: 'manifest.json', bytes: encoder.encode('{"version":1}') },
      { path: 'attachments/测试.txt', bytes: encoder.encode('hello') },
    ])
    const file = new File([blob], 'backup.zip', { type: 'application/zip' })
    const entries = await readZingZip(file)
    expect(new TextDecoder().decode(entries.get('attachments/测试.txt'))).toBe('hello')
    expect(decodeBackupJson<{version:number}>(entries, 'manifest.json')).toEqual({ version: 1 })
  })

  test('backup JSON decoder keeps missing and malformed file failures explicit', () => {
    expect(() => decodeBackupJson(new Map(), 'data/tasks.json')).toThrow('缺少 data/tasks.json')
    expect(() => decodeBackupJson(new Map([['bad.json', new TextEncoder().encode('{')]]), 'bad.json')).toThrow('bad.json 无法解析')
  })
})
