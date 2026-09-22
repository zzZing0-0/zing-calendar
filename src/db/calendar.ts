const DB_NAME = 'zing-calendar'
const DB_VERSION = 6
const TASK_STORE = 'tasks'
const JOURNAL_STORE = 'journalEntries'
const MOOD_STORE = 'dailyMoods'
const TAG_STORE = 'tags'
const ATTACHMENT_STORE = 'attachments'
const ANNIVERSARY_STORE = 'anniversaries'
const SYNC_META_STORE = 'syncMetadata'
const SYNC_TOMBSTONE_STORE = 'syncTombstones'
const SYNC_CHANGE_STORE = 'syncChanges'

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
      if (!db.objectStoreNames.contains(SYNC_META_STORE)) db.createObjectStore(SYNC_META_STORE, { keyPath: 'key' })
      if (!db.objectStoreNames.contains(SYNC_TOMBSTONE_STORE)) db.createObjectStore(SYNC_TOMBSTONE_STORE, { keyPath: 'key' })
      if (!db.objectStoreNames.contains(SYNC_CHANGE_STORE)) {
        const changes = db.createObjectStore(SYNC_CHANGE_STORE, { keyPath: 'sequence', autoIncrement: true })
        changes.createIndex('byEntity', ['entityType', 'entityId'], { unique: false })
        changes.createIndex('byChangedAt', 'changedAt', { unique: false })
      }
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


// ---- v0.9 sync-ready foundation -------------------------------------------
// These stores are intentionally passive in v0.9.0: existing local CRUD keeps
// working exactly as before. Later sync releases can use this metadata without
// changing the user's task/journal data model or exposing credentials client-side.

export type SyncEntityType = 'task' | 'journal' | 'mood' | 'tag' | 'anniversary'
export type SyncOperation = 'upsert' | 'delete'

export type SyncChange = {
  sequence?: number
  entityType: SyncEntityType
  entityId: string
  operation: SyncOperation
  changedAt: string
  deviceId: string
}

export type SyncTombstone = {
  key: string
  entityType: SyncEntityType
  entityId: string
  deletedAt: string
  deviceId: string
}

export type SyncState = {
  key: 'state'
  schemaVersion: 1
  deviceId: string
  lastPulledCursor?: string
  lastPushedSequence?: number
  lastSuccessfulSyncAt?: string
}

const DEVICE_ID_STORAGE_KEY = 'zing:deviceId'

export function getOrCreateDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY)
  if (existing) return existing
  const id = `device:${crypto.randomUUID()}`
  localStorage.setItem(DEVICE_ID_STORAGE_KEY, id)
  return id
}

export async function loadSyncState(): Promise<SyncState> {
  const db = await openDatabase()
  try {
    const stored = await new Promise<SyncState | undefined>((resolve, reject) => {
      const req = db.transaction(SYNC_META_STORE, 'readonly').objectStore(SYNC_META_STORE).get('state')
      req.onsuccess = () => resolve(req.result as SyncState | undefined)
      req.onerror = () => reject(req.error)
    })
    if (stored) return stored
    const initial: SyncState = { key: 'state', schemaVersion: 1, deviceId: getOrCreateDeviceId() }
    await saveSyncState(initial)
    return initial
  } finally {
    db.close()
  }
}

export async function saveSyncState(state: SyncState): Promise<void> {
  const db = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SYNC_META_STORE, 'readwrite')
      tx.objectStore(SYNC_META_STORE).put(state)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function appendSyncChange(change: Omit<SyncChange, 'sequence'>): Promise<void> {
  const db = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SYNC_CHANGE_STORE, 'readwrite')
      tx.objectStore(SYNC_CHANGE_STORE).add(change)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function loadSyncChangesAfter(sequence = 0): Promise<SyncChange[]> {
  const rows = await loadAll<SyncChange>(SYNC_CHANGE_STORE)
  return rows
    .filter(row => (row.sequence ?? 0) > sequence)
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
}

export async function saveSyncTombstone(tombstone: SyncTombstone): Promise<void> {
  const db = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SYNC_TOMBSTONE_STORE, 'readwrite')
      tx.objectStore(SYNC_TOMBSTONE_STORE).put(tombstone)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export const loadSyncTombstones = () => loadAll<SyncTombstone>(SYNC_TOMBSTONE_STORE)

export async function clearSyncTombstone(key: string): Promise<void> {
  const db = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SYNC_TOMBSTONE_STORE, 'readwrite')
      tx.objectStore(SYNC_TOMBSTONE_STORE).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}


// ---- v0.9.2 portable sync engine ------------------------------------------
// A transport-neutral bundle: later the same object can travel through an old
// Mac server, a hosted API, or another backend without changing merge semantics.

export type SyncEntityRecord = {
  entityType: SyncEntityType
  entityId: string
  updatedAt: string
  payload: any
}

export type SyncBundle = {
  protocolVersion: 1
  exportedAt: string
  deviceId: string
  records: SyncEntityRecord[]
  tombstones: SyncTombstone[]
}

function entityStoreName(entityType: SyncEntityType): string {
  if (entityType === 'task') return TASK_STORE
  if (entityType === 'journal') return JOURNAL_STORE
  if (entityType === 'mood') return MOOD_STORE
  if (entityType === 'tag') return TAG_STORE
  return ANNIVERSARY_STORE
}

function entityIdOf(entityType: SyncEntityType, row: any): string {
  return entityType === 'mood' ? String(row.date) : String(row.id)
}

function entityUpdatedAt(row: any): string {
  return String(row.updatedAt ?? row.createdAt ?? '1970-01-01T00:00:00.000Z')
}

export async function createSyncBundle(): Promise<SyncBundle> {
  const deviceId = getOrCreateDeviceId()
  const entityTypes: SyncEntityType[] = ['task', 'journal', 'mood', 'tag', 'anniversary']
  const records: SyncEntityRecord[] = []
  for (const entityType of entityTypes) {
    const rows = await loadAll<any>(entityStoreName(entityType))
    rows.forEach(row => records.push({
      entityType,
      entityId: entityIdOf(entityType, row),
      updatedAt: entityUpdatedAt(row),
      payload: row,
    }))
  }
  return {
    protocolVersion: 1,
    exportedAt: new Date().toISOString(),
    deviceId,
    records,
    tombstones: await loadSyncTombstones(),
  }
}

export type SyncMergePlan = {
  upserts: SyncEntityRecord[]
  deletes: SyncTombstone[]
  ignoredRemoteRecords: number
  ignoredRemoteTombstones: number
}

export async function planSyncMerge(remote: SyncBundle): Promise<SyncMergePlan> {
  if (remote.protocolVersion !== 1) throw new Error(`不支持的同步协议版本：${remote.protocolVersion}`)
  const local = await createSyncBundle()
  const localRecords = new Map(local.records.map(record => [`${record.entityType}:${record.entityId}`, record]))
  const localTombstones = new Map(local.tombstones.map(tombstone => [tombstone.key, tombstone]))
  const upserts: SyncEntityRecord[] = []
  const deletes: SyncTombstone[] = []
  let ignoredRemoteRecords = 0
  let ignoredRemoteTombstones = 0

  for (const remoteRecord of remote.records) {
    const key = `${remoteRecord.entityType}:${remoteRecord.entityId}`
    const localRecord = localRecords.get(key)
    const localDelete = localTombstones.get(key)
    const remoteTime = Date.parse(remoteRecord.updatedAt) || 0
    const localTime = localRecord ? (Date.parse(localRecord.updatedAt) || 0) : 0
    const deleteTime = localDelete ? (Date.parse(localDelete.deletedAt) || 0) : 0

    // Last-write-wins at record level for v0.9.2. A newer local deletion wins
    // over an older remote record, preventing deleted items from resurrecting.
    if (remoteTime > Math.max(localTime, deleteTime)) upserts.push(remoteRecord)
    else ignoredRemoteRecords += 1
  }

  for (const remoteDelete of remote.tombstones) {
    const key = remoteDelete.key
    const localRecord = localRecords.get(key)
    const localDelete = localTombstones.get(key)
    const remoteDeleteTime = Date.parse(remoteDelete.deletedAt) || 0
    const localRecordTime = localRecord ? (Date.parse(localRecord.updatedAt) || 0) : 0
    const localDeleteTime = localDelete ? (Date.parse(localDelete.deletedAt) || 0) : 0
    if (remoteDeleteTime > Math.max(localRecordTime, localDeleteTime)) deletes.push(remoteDelete)
    else ignoredRemoteTombstones += 1
  }

  return { upserts, deletes, ignoredRemoteRecords, ignoredRemoteTombstones }
}

export async function applySyncMerge(plan: SyncMergePlan): Promise<void> {
  const db = await openDatabase()
  const stores = [TASK_STORE, JOURNAL_STORE, MOOD_STORE, TAG_STORE, ANNIVERSARY_STORE, SYNC_TOMBSTONE_STORE]
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(stores, 'readwrite')

      plan.upserts.forEach(record => {
        tx.objectStore(entityStoreName(record.entityType)).put(record.payload)
        tx.objectStore(SYNC_TOMBSTONE_STORE).delete(`${record.entityType}:${record.entityId}`)
      })

      plan.deletes.forEach(tombstone => {
        const store = tx.objectStore(entityStoreName(tombstone.entityType))
        store.delete(tombstone.entityId)
        tx.objectStore(SYNC_TOMBSTONE_STORE).put(tombstone)
      })

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}


// ---- v0.9.3 sync transport -------------------------------------------------
// Backend contract:
//   GET  {baseUrl}/api/sync/bundle  -> SyncBundle
//   PUT  {baseUrl}/api/sync/bundle  <- SyncBundle, -> optional SyncBundle
// The client never embeds a GitHub token or server secret. Authentication can
// later be supplied by the deployment layer via headers/session cookies.

export type SyncTransportConfig = {
  baseUrl: string
  authToken?: string
}

export type SyncTransportResult = {
  remoteBundle?: SyncBundle
  status: number
}

function normalizeSyncBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

function syncHeaders(config: SyncTransportConfig): HeadersInit {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (config.authToken) headers.Authorization = `Bearer ${config.authToken}`
  return headers
}

export async function pullSyncBundle(config: SyncTransportConfig): Promise<SyncBundle> {
  const baseUrl = normalizeSyncBaseUrl(config.baseUrl)
  if (!baseUrl) throw new Error('同步服务器地址为空')
  const response = await fetch(`${baseUrl}/api/sync/bundle`, {
    method: 'GET',
    headers: syncHeaders(config),
  })
  if (!response.ok) throw new Error(`同步下载失败（HTTP ${response.status}）`)
  const bundle = await response.json() as SyncBundle
  if (bundle.protocolVersion !== 1) throw new Error(`不支持的同步协议版本：${bundle.protocolVersion}`)
  return bundle
}

export async function pushSyncBundle(config: SyncTransportConfig, bundle: SyncBundle): Promise<SyncTransportResult> {
  const baseUrl = normalizeSyncBaseUrl(config.baseUrl)
  if (!baseUrl) throw new Error('同步服务器地址为空')
  const response = await fetch(`${baseUrl}/api/sync/bundle`, {
    method: 'PUT',
    headers: { ...syncHeaders(config), 'Content-Type': 'application/json' },
    body: JSON.stringify(bundle),
  })
  if (!response.ok) throw new Error(`同步上传失败（HTTP ${response.status}）`)
  if (response.status === 204) return { status: response.status }
  const text = await response.text()
  return {
    status: response.status,
    remoteBundle: text ? JSON.parse(text) as SyncBundle : undefined,
  }
}

export type SyncRoundTripResult = {
  pulled: { upserts: number; deletes: number }
  pushedRecords: number
  pushedTombstones: number
  finishedAt: string
}

// Pull -> merge -> rebuild local bundle -> push.
// Keeping this orchestration in the data layer means UI and backend remain replaceable.
export async function syncRoundTrip(config: SyncTransportConfig): Promise<SyncRoundTripResult> {
  const remote = await pullSyncBundle(config)
  const plan = await planSyncMerge(remote)
  await applySyncMerge(plan)
  const mergedLocal = await createSyncBundle()
  await pushSyncBundle(config, mergedLocal)
  const finishedAt = new Date().toISOString()
  const state = await loadSyncState()
  await saveSyncState({ ...state, lastSuccessfulSyncAt: finishedAt })
  return {
    pulled: { upserts: plan.upserts.length, deletes: plan.deletes.length },
    pushedRecords: mergedLocal.records.length,
    pushedTombstones: mergedLocal.tombstones.length,
    finishedAt,
  }
}


// ---- v0.9.4 GitHub sync provider ------------------------------------------
// Stores the transport-neutral SyncBundle in a dedicated private GitHub repo.
// Authentication is deliberately injected at runtime and is never persisted by
// this provider. Do not put a PAT in source code, localStorage, or a public build.

export type GitHubSyncConfig = {
  owner: string
  repo: string
  branch?: string
  path?: string
  token: string
}

type GitHubContentsFile = {
  type: 'file'
  encoding?: string
  content?: string
  sha: string
  download_url?: string | null
}

const GITHUB_API_BASE = 'https://api.github.com'

function githubSyncPath(config: GitHubSyncConfig) {
  return (config.path?.trim() || 'zing/sync-bundle.json').replace(/^\/+/, '')
}

function githubHeaders(config: GitHubSyncConfig): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${config.token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

function utf8ToBase64(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

function base64ToUtf8(value: string): string {
  const binary = atob(value.replace(/\s/g, ''))
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

async function readGitHubBundleFile(config: GitHubSyncConfig): Promise<{ bundle?: SyncBundle; sha?: string }> {
  const branch = config.branch?.trim() || 'main'
  const path = githubSyncPath(config)
  const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`
  const response = await fetch(url, { headers: githubHeaders(config) })
  if (response.status === 404) return {}
  if (!response.ok) throw new Error(`GitHub 同步读取失败（HTTP ${response.status}）`)
  const file = await response.json() as GitHubContentsFile
  if (file.type !== 'file') throw new Error('GitHub 同步路径不是文件')

  let rawJson = ''
  if (file.encoding === 'base64' && file.content) {
    rawJson = base64ToUtf8(file.content)
  } else {
    // For larger files GitHub may omit base64 content from the JSON response.
    // Request the same authenticated Contents API endpoint as raw media instead
    // of following download_url (whose host/auth behavior can differ).
    const rawResponse = await fetch(url, {
      headers: {
        ...githubHeaders(config),
        Accept: 'application/vnd.github.raw+json',
      },
    })
    if (!rawResponse.ok) throw new Error(`GitHub 同步文件下载失败（HTTP ${rawResponse.status}）`)
    rawJson = await rawResponse.text()
  }

  let bundle: SyncBundle
  try {
    bundle = JSON.parse(rawJson) as SyncBundle
  } catch {
    throw new Error('GitHub 同步文件 JSON 无法解析')
  }
  if (bundle.protocolVersion !== 1) throw new Error(`不支持的同步协议版本：${bundle.protocolVersion}`)
  if (!Array.isArray(bundle.records) || !Array.isArray(bundle.tombstones)) throw new Error('GitHub 同步文件结构无效')
  return { bundle, sha: file.sha }
}

async function writeGitHubBundleFile(config: GitHubSyncConfig, bundle: SyncBundle, sha?: string): Promise<void> {
  const branch = config.branch?.trim() || 'main'
  const path = githubSyncPath(config)
  const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}`
  const body: Record<string, unknown> = {
    message: `sync: Zing data ${new Date().toISOString()}`,
    branch,
    content: utf8ToBase64(JSON.stringify(bundle)),
  }
  if (sha) body.sha = sha
  const response = await fetch(url, {
    method: 'PUT',
    headers: { ...githubHeaders(config), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`GitHub 同步写入失败（HTTP ${response.status}）`)
}

export type GitHubSyncResult = {
  initializedRemote: boolean
  pulled: { upserts: number; deletes: number }
  pushedRecords: number
  pushedTombstones: number
  finishedAt: string
}

export async function syncWithGitHub(config: GitHubSyncConfig): Promise<GitHubSyncResult> {
  if (!config.owner.trim() || !config.repo.trim()) throw new Error('GitHub 数据仓库信息不完整')
  if (!config.token.trim()) throw new Error('GitHub 访问令牌为空')

  const remote = await readGitHubBundleFile(config)
  let pulled = { upserts: 0, deletes: 0 }

  if (remote.bundle) {
    const plan = await planSyncMerge(remote.bundle)
    await applySyncMerge(plan)
    pulled = { upserts: plan.upserts.length, deletes: plan.deletes.length }
  }

  const mergedLocal = await createSyncBundle()
  await writeGitHubBundleFile(config, mergedLocal, remote.sha)

  const finishedAt = new Date().toISOString()
  const state = await loadSyncState()
  await saveSyncState({ ...state, lastSuccessfulSyncAt: finishedAt })

  return {
    initializedRemote: !remote.bundle,
    pulled,
    pushedRecords: mergedLocal.records.length,
    pushedTombstones: mergedLocal.tombstones.length,
    finishedAt,
  }
}


export async function replaceZingData(payload: {
  tasks:any[]; journals:any[]; moods:any[]; tags:any[]; anniversaries:any[];
  attachments:{key:string;blob:Blob}[]
}): Promise<void> {
  const db=await openDatabase()
  const stores=[TASK_STORE,JOURNAL_STORE,MOOD_STORE,TAG_STORE,ANNIVERSARY_STORE,ATTACHMENT_STORE]
  try {
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(stores,'readwrite')
      const replace=(name:string,rows:any[])=>{ const store=tx.objectStore(name); store.clear(); rows.forEach(row=>store.put(row)) }
      replace(TASK_STORE,payload.tasks); replace(JOURNAL_STORE,payload.journals); replace(MOOD_STORE,payload.moods)
      replace(TAG_STORE,payload.tags); replace(ANNIVERSARY_STORE,payload.anniversaries)
      const attachments=tx.objectStore(ATTACHMENT_STORE); attachments.clear()
      payload.attachments.forEach(item=>attachments.put(item.blob,item.key))
      tx.oncomplete=()=>resolve()
      tx.onerror=()=>reject(tx.error ?? new Error('恢复事务失败'))
      tx.onabort=()=>reject(tx.error ?? new Error('恢复事务已回滚'))
    })
  } finally { db.close() }
}
