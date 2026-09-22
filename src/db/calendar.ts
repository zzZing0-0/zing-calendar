const DB_NAME = 'zing-calendar'
const DB_VERSION = 5
const TASK_STORE = 'tasks'
const JOURNAL_STORE = 'journalEntries'
const MOOD_STORE = 'dailyMoods'
const TAG_STORE = 'tags'
const ATTACHMENT_STORE = 'attachments'
const ANNIVERSARY_STORE = 'anniversaries'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(TASK_STORE)) db.createObjectStore(TASK_STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(JOURNAL_STORE)) db.createObjectStore(JOURNAL_STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(MOOD_STORE)) db.createObjectStore(MOOD_STORE, { keyPath: 'date' })
      if (!db.objectStoreNames.contains(TAG_STORE)) db.createObjectStore(TAG_STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(ATTACHMENT_STORE)) db.createObjectStore(ATTACHMENT_STORE)
      if (!db.objectStoreNames.contains(ANNIVERSARY_STORE)) db.createObjectStore(ANNIVERSARY_STORE, { keyPath: 'id' })
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function loadAll<T>(storeName: string): Promise<T[]> {
  const db = await openDatabase()
  try {
    return await new Promise<T[]>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly')
      const request = transaction.objectStore(storeName).getAll()
      request.onsuccess = () => resolve(request.result as T[])
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

async function replaceAll<T>(storeName: string, rows: T[]): Promise<void> {
  const db = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      store.clear()
      rows.forEach(row => store.put(row))
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

export const loadAnniversaries = <T,>() => loadAll<T>(ANNIVERSARY_STORE)
export const saveAnniversaries = <T,>(rows: T[]) => replaceAll(ANNIVERSARY_STORE, rows)
export const loadTasks = <T,>() => loadAll<T>(TASK_STORE)
export const saveTasks = <T,>(rows: T[]) => replaceAll(TASK_STORE, rows)
export const loadJournalEntries = <T,>() => loadAll<T>(JOURNAL_STORE)
export const saveJournalEntries = <T,>(rows: T[]) => replaceAll(JOURNAL_STORE, rows)
export const loadDailyMoods = <T,>() => loadAll<T>(MOOD_STORE)
export const saveDailyMoods = <T,>(rows: T[]) => replaceAll(MOOD_STORE, rows)

export const loadTags = <T,>() => loadAll<T>(TAG_STORE)
export const saveTags = <T,>(rows: T[]) => replaceAll(TAG_STORE, rows)

export async function putAttachmentBlob(key: string, blob: Blob): Promise<void> {
  const db = await openDatabase()
  try { await new Promise<void>((resolve, reject) => { const tx = db.transaction(ATTACHMENT_STORE, 'readwrite'); tx.objectStore(ATTACHMENT_STORE).put(blob, key); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error) }) } finally { db.close() }
}
export async function getAttachmentBlob(key: string): Promise<Blob | undefined> {
  const db = await openDatabase()
  try { return await new Promise((resolve, reject) => { const req = db.transaction(ATTACHMENT_STORE, 'readonly').objectStore(ATTACHMENT_STORE).get(key); req.onsuccess = () => resolve(req.result as Blob | undefined); req.onerror = () => reject(req.error) }) } finally { db.close() }
}
export async function deleteAttachmentBlob(key: string): Promise<void> {
  const db = await openDatabase()
  try { await new Promise<void>((resolve, reject) => { const tx = db.transaction(ATTACHMENT_STORE, 'readwrite'); tx.objectStore(ATTACHMENT_STORE).delete(key); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error) }) } finally { db.close() }
}

export type ZingStorageStats = { total:number; images:number; audio:number; data:number; attachmentCount:number }
export async function getStorageStats(): Promise<ZingStorageStats> {
  const db = await openDatabase()
  try {
    const blobs = await new Promise<Blob[]>((resolve,reject) => {
      const req = db.transaction(ATTACHMENT_STORE,'readonly').objectStore(ATTACHMENT_STORE).getAll()
      req.onsuccess=()=>resolve((req.result ?? []) as Blob[])
      req.onerror=()=>reject(req.error)
    })
    let images=0, audio=0
    blobs.forEach(blob => { if (blob.type.startsWith('image/')) images += blob.size; else if (blob.type.startsWith('audio/')) audio += blob.size })
    let data=0
    for (const storeName of [TASK_STORE,JOURNAL_STORE,MOOD_STORE,TAG_STORE,ANNIVERSARY_STORE]) {
      const rows = await loadAll<any>(storeName)
      data += new Blob([JSON.stringify(rows)]).size
    }
    return { total:images+audio+data, images, audio, data, attachmentCount:blobs.length }
  } finally { db.close() }
}

export async function cleanupOrphanAttachmentBlobs(referencedKeys: string[]): Promise<number> {
  const db = await openDatabase()
  try {
    const referenced = new Set(referencedKeys)
    return await new Promise<number>((resolve,reject) => {
      const tx = db.transaction(ATTACHMENT_STORE,'readwrite')
      const store = tx.objectStore(ATTACHMENT_STORE)
      const request = store.openCursor()
      let removed = 0
      request.onsuccess = () => {
        const cursor = request.result
        if (!cursor) return
        if (!referenced.has(String(cursor.key))) {
          cursor.delete()
          removed += 1
        }
        cursor.continue()
      }
      request.onerror = () => reject(request.error)
      tx.oncomplete = () => resolve(removed)
      tx.onerror = () => reject(tx.error)
    })
  } finally { db.close() }
}
