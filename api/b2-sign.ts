// Short-lived S3-compatible presigned URLs for the private Backblaze B2 bucket.
// Binary bytes travel browser <-> B2 directly; long-lived B2 credentials stay on Vercel.
import crypto from 'node:crypto'

const required = (name: string): string => {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

const hmac = (key: crypto.BinaryLike | crypto.KeyObject, value: string, encoding?: crypto.BinaryToTextEncoding) => {
  const digest = crypto.createHmac('sha256', key).update(value, 'utf8')
  return encoding ? digest.digest(encoding) : digest.digest()
}
const sha256 = (value: string) => crypto.createHash('sha256').update(value, 'utf8').digest('hex')
const awsEncode = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)

function safeKey(raw: string | null): string | null {
  // New attachments use attachment:<uuid>. Keep the two legacy Journal prefixes
  // readable/signable so existing pre-fix records can migrate to B2 without rewriting data.
  if (!raw || !/^(?:attachment|journal|journal-audio):[0-9a-f-]{16,}$/i.test(raw)) return null
  return raw
}

function presign({ method, key, expires = 300 }: { method: 'GET' | 'HEAD' | 'PUT'; key: string; expires?: number }) {
  const accessKey = required('B2_KEY_ID')
  const secretKey = required('B2_APPLICATION_KEY')
  const bucket = required('B2_BUCKET_NAME')
  const endpoint = required('B2_ENDPOINT').replace(/^https?:\/\//, '').replace(/\/$/, '')
  const region = endpoint.match(/^s3\.([^.]+)\.backblazeb2\.com$/)?.[1]
  if (!region) throw new Error('B2_ENDPOINT must look like s3.us-west-004.backblazeb2.com')

  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  const service = 's3'
  const scope = `${dateStamp}/${region}/${service}/aws4_request`
  const host = endpoint
  const canonicalUri = `/${awsEncode(bucket)}/${awsEncode(key)}`
  const query: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKey}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expires),
    'X-Amz-SignedHeaders': 'host',
  }
  const canonicalQuery = Object.entries(query)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${awsEncode(k)}=${awsEncode(v)}`)
    .join('&')
  const canonicalHeaders = `host:${host}\n`
  const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQuery}\n${canonicalHeaders}\nhost\nUNSIGNED-PAYLOAD`
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${sha256(canonicalRequest)}`
  const kDate = hmac(Buffer.from(`AWS4${secretKey}`, 'utf8'), dateStamp)
  const kRegion = hmac(kDate, region)
  const kService = hmac(kRegion, service)
  const kSigning = hmac(kService, 'aws4_request')
  const signature = hmac(kSigning, stringToSign, 'hex')
  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`
}

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url)
    const key = safeKey(url.searchParams.get('key'))
    const method = url.searchParams.get('method')
    if (!key || (method !== 'GET' && method !== 'HEAD' && method !== 'PUT')) {
      return Response.json({ error: 'Invalid attachment signing request' }, { status: 400 })
    }
    return Response.json(
      { url: presign({ method, key }) },
      { status: 200, headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error) {
    console.error('B2 presign error', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'B2 presign error' },
      { status: 500 },
    )
  }
}
