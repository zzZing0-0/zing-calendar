/** A rejected enqueue must abort too: synchronous put()/clone errors do not auto-abort IDB. */
export function completeWrite(transaction: IDBTransaction, enqueue: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    let cause: unknown
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => { cause ??= transaction.error }
    transaction.onabort = () => reject(cause ?? transaction.error ?? new Error('数据写入已回滚'))
    try { enqueue() } catch (error) {
      cause = error
      try { transaction.abort() } catch { reject(error) }
    }
  })
}

export function validateStoreRows(keyPath: string, rows: unknown): asserts rows is Record<string, unknown>[] {
  if (!Array.isArray(rows)) throw new Error('数据必须为记录数组')
  const keys = new Set<string>()
  for (const row of rows) {
    const key = row?.[keyPath]
    if (typeof key !== 'string' || !key.trim()) throw new Error('记录缺少有效标识')
    if (keys.has(key)) throw new Error('记录标识重复')
    keys.add(key)
  }
}
