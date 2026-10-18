import { safeB2Key } from './api-security.js'

/** Read only the server-pinned ledger. Client reference lists can add protection,
 * but cannot remove references found in the current cloud data, including trash.
 */
export async function readB2LedgerReferences(request: Request): Promise<Set<string>> {
  const repo = process.env.ZING_B2_GITHUB_REPOSITORY!
  const branch = process.env.ZING_B2_GITHUB_BRANCH || 'main'
  const path = process.env.ZING_B2_GITHUB_BUNDLE_PATH || 'zing/sync-bundle.json'
  if (path.split('/').some(part => !part || part === '.' || part === '..') || /[\\\0]/.test(path)) throw new Error('Invalid ledger path')
  const read = async (path: string) => {
    const response = await fetch(`https://api.github.com/repos/${repo}/${path}`, {
      headers: { Authorization: request.headers.get('authorization')!, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new Error('Ledger unavailable')
    return response.json()
  }
  const file = await read(`contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`)
  if (file.type !== 'file' || typeof file.sha !== 'string' || !/^[a-f0-9]{7,64}$/i.test(file.sha)) throw new Error('Invalid ledger file')
  const data = file.encoding === 'base64' && file.content ? file : await read(`git/blobs/${file.sha}`)
  if (data.encoding !== 'base64' || typeof data.content !== 'string' || !/^[A-Za-z0-9+/=\r\n]+$/.test(data.content)) throw new Error('Invalid ledger encoding')
  const bytes = Buffer.from(data.content.replace(/\s/g, ''), 'base64')
  const bundle = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  if (bundle?.protocolVersion !== 1 || !Array.isArray(bundle.records) || !Array.isArray(bundle.tombstones)) throw new Error('Invalid ledger bundle')
  const types = new Set(['task','journal','note','notebook','mood','energy','environment','period','tag','anniversary','focus','habit','habitCheckIn','settings'])
  const keys = new Set<string>()
  const collect = (attachments: unknown) => {
    if (attachments === undefined) return
    if (!Array.isArray(attachments)) throw new Error('Invalid ledger attachments')
    for (const attachment of attachments) {
      if (!attachment || typeof attachment.storageKey !== 'string' || !attachment.storageKey) throw new Error('Invalid ledger attachment')
      // Legacy non-B2 keys remain valid data, but cannot be deleted by this API.
      if (safeB2Key(attachment.storageKey)) keys.add(attachment.storageKey)
    }
  }
  for (const record of bundle.records) {
    if (!record || !types.has(record.entityType) || !record.payload || typeof record.payload !== 'object' || Array.isArray(record.payload)) throw new Error('Invalid ledger record')
    if (['task','journal','note'].includes(record.entityType)) {
      collect(record.payload.attachments)
      if (record.entityType === 'task' && record.payload.recurrenceExceptions !== undefined) {
        const exceptions = record.payload.recurrenceExceptions
        if (!exceptions || typeof exceptions !== 'object' || Array.isArray(exceptions)) throw new Error('Invalid recurring attachments')
        for (const exception of Object.values(exceptions)) {
          if (!exception || typeof exception !== 'object') throw new Error('Invalid recurring attachment')
          collect((exception as any).attachments)
        }
      }
    }
  }
  return keys
}
