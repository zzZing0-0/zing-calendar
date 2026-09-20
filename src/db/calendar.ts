const DB_NAME = 'zing-calendar'
const DB_VERSION = 3
const TASK_STORE = 'tasks'
const JOURNAL_STORE = 'journalEntries'
const MOOD_STORE = 'dailyMoods'
const TAG_STORE = 'tags'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(TASK_STORE)) db.createObjectStore(TASK_STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(JOURNAL_STORE)) db.createObjectStore(JOURNAL_STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(MOOD_STORE)) db.createObjectStore(MOOD_STORE, { keyPath: 'date' })
      if (!db.objectStoreNames.contains(TAG_STORE)) db.createObjectStore(TAG_STORE, { keyPath: 'id' })
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

export const loadTasks = <T,>() => loadAll<T>(TASK_STORE)
export const saveTasks = <T,>(rows: T[]) => replaceAll(TASK_STORE, rows)
export const loadJournalEntries = <T,>() => loadAll<T>(JOURNAL_STORE)
export const saveJournalEntries = <T,>(rows: T[]) => replaceAll(JOURNAL_STORE, rows)
export const loadDailyMoods = <T,>() => loadAll<T>(MOOD_STORE)
export const saveDailyMoods = <T,>(rows: T[]) => replaceAll(MOOD_STORE, rows)

export const loadTags = <T,>() => loadAll<T>(TAG_STORE)
export const saveTags = <T,>(rows: T[]) => replaceAll(TAG_STORE, rows)
