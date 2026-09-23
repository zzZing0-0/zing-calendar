// Returns short-lived S3-compatible presigned URLs for the private B2 bucket.
// Binary bytes travel browser <-> B2 directly, avoiding Vercel Function body limits
// (important for 30-minute journal audio). Long-lived B2 credentials never leave Vercel.
import crypto from 'node:crypto'

const required = name => {
  const value = process.env[name]
  if (!value) throw new Error(`Missing ${name}`)
  return value
}
const hmac = (key, value, encoding) => crypto.createHmac('sha256', key).update(value, 'utf8').digest(encoding)
const sha256 = value => crypto.createHash('sha256').update(value, 'utf8').digest('hex')
const awsEncode = value => encodeURIComponent(value).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)

function safeKey(raw) {
  if (typeof raw !== 'string' || !/^attachment:[0-9a-f-]{16,}$/i.test(raw)) return null
  return raw
}

function presign({ method, key, expires = 300 }) {
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
  const query = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKey}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expires),
    'X-Amz-SignedHeaders': 'host',
  }
  const canonicalQuery = Object.entries(query).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${awsEncode(k)}=${awsEncode(v)}`).join('&')
  const canonicalHeaders = `host:${host}\n`
  const payloadHash = 'UNSIGNED-PAYLOAD'
  const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQuery}\n${canonicalHeaders}\nhost\n${payloadHash}`
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${sha256(canonicalRequest)}`
  const kDate = hmac(Buffer.from(`AWS4${secretKey}`, 'utf8'), dateStamp)
  const kRegion = hmac(kDate, region)
  const kService = hmac(kRegion, service)
  const kSigning = hmac(kService, 'aws4_request')
  const signature = hmac(kSigning, stringToSign, 'hex')
  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return res.status(405).end()
    }
    const key = safeKey(req.query?.key)
    const method = String(req.query?.method || '')
    if (!key || !['GET','HEAD','PUT'].includes(method)) return res.status(400).json({ error: 'Invalid attachment signing request' })
    res.setHeader('Cache-Control', 'private, no-store')
    return res.status(200).json({ url: presign({ method, key }) })
  } catch (error) {
    console.error('B2 presign error', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'B2 presign error' })
  }
}
