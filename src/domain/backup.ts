import type { Attachment } from '../types'

export type ZipEntry = { path: string; bytes: Uint8Array }

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

function zipDateTime(date: Date) {
  const year = Math.max(1980, date.getFullYear())
  return { time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1), date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate() }
}

function concatBytes(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  parts.forEach(part => { out.set(part, offset); offset += part.length })
  return out
}

function u16(value: number) { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, value, true); return b }
function u32(value: number) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, value >>> 0, true); return b }

export function makeZip(entries: ZipEntry[]): Blob {
  const encoder = new TextEncoder(), locals: Uint8Array[] = [], centrals: Uint8Array[] = []
  let offset = 0
  const stamp = zipDateTime(new Date())
  entries.forEach(entry => {
    const name = encoder.encode(entry.path), crc = crc32(entry.bytes), size = entry.bytes.length
    const local = concatBytes([u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(stamp.time), u16(stamp.date), u32(crc), u32(size), u32(size), u16(name.length), u16(0), name, entry.bytes])
    locals.push(local)
    centrals.push(concatBytes([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(stamp.time), u16(stamp.date), u32(crc), u32(size), u32(size), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]))
    offset += local.length
  })
  const centralBytes = concatBytes(centrals)
  const end = concatBytes([u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length), u32(centralBytes.length), u32(offset), u16(0)])
  const blobParts: BlobPart[] = [...locals, centralBytes, end].map(bytes => {
    const copy = new Uint8Array(bytes.byteLength)
    copy.set(bytes)
    return copy.buffer
  })
  return new Blob(blobParts, { type: 'application/zip' })
}

export function safeBackupFilename(name: string) {
  return name.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim() || 'attachment'
}

export function attachmentExtension(attachment: Attachment) {
  const match = attachment.filename.match(/(\.[A-Za-z0-9]{1,8})$/)
  if (match) return match[1].toLowerCase()
  if (attachment.mimeType === 'image/webp') return '.webp'
  if (attachment.mimeType === 'image/png') return '.png'
  if (attachment.mimeType === 'image/jpeg') return '.jpg'
  if (attachment.mimeType.includes('webm')) return '.webm'
  if (attachment.mimeType.includes('mp4')) return '.m4a'
  return attachment.type === 'image' ? '.img' : '.audio'
}

function readU16(view: DataView, offset: number) { return view.getUint16(offset, true) }
function readU32(view: DataView, offset: number) { return view.getUint32(offset, true) }

export async function readZingZip(file: File): Promise<Map<string, Uint8Array>> {
  const bytes = new Uint8Array(await file.arrayBuffer()), view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const decoder = new TextDecoder(), entries = new Map<string, Uint8Array>()
  let offset = 0
  while (offset + 4 <= bytes.length) {
    const signature = readU32(view, offset)
    if (signature === 0x02014b50 || signature === 0x06054b50) break
    if (signature !== 0x04034b50) throw new Error('ZIP 结构无法识别')
    const flags = readU16(view, offset + 6), method = readU16(view, offset + 8), compressedSize = readU32(view, offset + 18), uncompressedSize = readU32(view, offset + 22)
    const nameLength = readU16(view, offset + 26), extraLength = readU16(view, offset + 28)
    if (flags & 0x0008) throw new Error('不支持 data descriptor ZIP')
    if (method !== 0) throw new Error('备份 ZIP 使用了不支持的压缩方式')
    const nameStart = offset + 30, dataStart = nameStart + nameLength + extraLength, dataEnd = dataStart + compressedSize
    if (dataEnd > bytes.length) throw new Error('ZIP 文件不完整')
    const name = decoder.decode(bytes.slice(nameStart, nameStart + nameLength))
    const payload = bytes.slice(dataStart, dataEnd)
    if (payload.length !== uncompressedSize) throw new Error(`文件大小异常：${name}`)
    entries.set(name, payload); offset = dataEnd
  }
  return entries
}

export function decodeBackupJson<T>(entries: Map<string, Uint8Array>, path: string): T {
  const bytes = entries.get(path)
  if (!bytes) throw new Error(`缺少 ${path}`)
  try { return JSON.parse(new TextDecoder().decode(bytes)) as T } catch { throw new Error(`${path} 无法解析`) }
}

export function csvCell(value: unknown) {
  const text = value == null ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}
