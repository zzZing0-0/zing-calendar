import type { Attachment, Note, Notebook } from '../types'

export const DEFAULT_NOTEBOOK_ID = 'notebook:default'
export const DEFAULT_NOTEBOOK_NAME = '默认'

export function ensureDefaultNotebook(rows: Notebook[], now = new Date().toISOString()): Notebook[] {
  const normalized = rows.filter(row => row?.id && row?.name).map((row, index) => ({ ...row, order: Number.isFinite(row.order) ? row.order : index }))
  if (normalized.some(row => row.id === DEFAULT_NOTEBOOK_ID)) return normalized.sort((a,b)=>a.order-b.order)
  return [{ id: DEFAULT_NOTEBOOK_ID, name: DEFAULT_NOTEBOOK_NAME, order: -1, system: true, createdAt: now, updatedAt: now }, ...normalized].sort((a,b)=>a.order-b.order)
}

export function normalizeNotes(rows: Note[], notebookIds: Set<string>): Note[] {
  return rows.filter(row => row?.id).map(row => ({
    ...row,
    title: String(row.title ?? '').trim() || '未命名笔记',
    content: String(row.content ?? ''),
    notebookId: notebookIds.has(row.notebookId) ? row.notebookId : DEFAULT_NOTEBOOK_ID,
    active: Boolean(row.active),
    activeOrder: Number.isFinite(row.activeOrder) ? row.activeOrder : undefined,
    tagIds: Array.isArray(row.tagIds) ? row.tagIds : [],
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    attachmentLinkTombstones: row.attachmentLinkTombstones ?? {},
  }))
}

export function activeNotes(rows: Note[]) {
  return rows.filter(row => row.active && !row.trashedAt).sort((a,b)=>(a.activeOrder??Number.MAX_SAFE_INTEGER)-(b.activeOrder??Number.MAX_SAFE_INTEGER)||a.createdAt.localeCompare(b.createdAt))
}

export function notesInNotebook(rows: Note[], notebookId: string) {
  return rows.filter(row => row.notebookId===notebookId && !row.trashedAt).sort((a,b)=>{
    if (a.active !== b.active) return a.active ? -1 : 1
    if (a.active) return (a.activeOrder??Number.MAX_SAFE_INTEGER)-(b.activeOrder??Number.MAX_SAFE_INTEGER)||a.createdAt.localeCompare(b.createdAt)
    return b.updatedAt.localeCompare(a.updatedAt)
  })
}

export function nextActiveOrder(rows: Note[]) { return Math.max(-1, ...rows.filter(row=>row.active&&!row.trashedAt).map(row=>row.activeOrder??-1)) + 1 }

export function reorderActiveNotes(rows: Note[], orderedIds: string[], now: string): Note[] {
  const order = new Map(orderedIds.map((id,index)=>[id,index]))
  return rows.map(row => order.has(row.id) ? { ...row, activeOrder: order.get(row.id), updatedAt: now } : row)
}

export function removeNotebook(rows: Note[], notebookId: string, now: string): Note[] {
  if (notebookId===DEFAULT_NOTEBOOK_ID) return rows
  return rows.map(row=>row.notebookId===notebookId?{...row,notebookId:DEFAULT_NOTEBOOK_ID,updatedAt:now}:row)
}


export function linkImageAttachmentToNote(rows: Note[], noteId: string, source: Attachment, now: string, linkId: string): Note[] {
  if (source.type !== 'image') return rows
  return rows.map(note => {
    if (note.id !== noteId || note.trashedAt) return note
    const attachments = note.attachments ?? []
    if (attachments.some(item => item.storageKey === source.storageKey)) return note
    if (attachments.filter(item => item.type === 'image').length >= 9) return note
    const tombstones = { ...(note.attachmentLinkTombstones ?? {}) }
    delete tombstones[source.storageKey]
    const linked: Attachment = { ...source, id: linkId, createdAt: now }
    return { ...note, attachments: [...attachments, linked], attachmentLinkTombstones: tombstones, updatedAt: now }
  })
}

export function trashNote(note: Note, now: string): Note {
  return { ...note, trashedAt: now, updatedAt: now }
}

export function restoreNote(note: Note, now: string): Note {
  return { ...note, trashedAt: undefined, updatedAt: now }
}

export function permanentlyDeleteNote(rows: Note[], noteId: string): Note[] {
  return rows.filter(note => note.id !== noteId)
}

export function purgeTrashedNotes(rows: Note[]): Note[] {
  return rows.filter(note => !note.trashedAt)
}
