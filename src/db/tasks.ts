const DB_NAME = 'zing-calendar'
const DB_VERSION = 1
const TASK_STORE = 'tasks'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(TASK_STORE)) {
        db.createObjectStore(TASK_STORE, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function loadTasks<T>(): Promise<T[]> {
  const db = await openDatabase()
  try {
    return await new Promise<T[]>((resolve, reject) => {
      const transaction = db.transaction(TASK_STORE, 'readonly')
      const request = transaction.objectStore(TASK_STORE).getAll()
      request.onsuccess = () => resolve(request.result as T[])
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

export async function saveTasks<T extends { id: string }>(tasks: T[]): Promise<void> {
  const db = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(TASK_STORE, 'readwrite')
      const store = transaction.objectStore(TASK_STORE)
      store.clear()
      tasks.forEach(task => store.put(task))
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}
