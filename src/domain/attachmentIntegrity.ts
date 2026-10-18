/** New attachments use content-addressed immutable keys. Legacy UUID keys stay readable. */
const HASH_KEY = /^attachment:([0-9a-f]{64})$/

export async function attachmentDigest(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function immutableAttachmentKey(blob: Blob): Promise<string> {
  return `attachment:${await attachmentDigest(blob)}`
}

export async function assertAttachmentIntegrity(key: string, blob: Blob): Promise<void> {
  const expected = HASH_KEY.exec(key)?.[1]
  if (expected && await attachmentDigest(blob) !== expected) {
    throw new Error(`附件内容校验失败，已停止同步（${key}）`)
  }
}
