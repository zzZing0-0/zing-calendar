import crypto from 'node:crypto'
import { authorizeB2 } from '../server/b2-authorization.js'
import { readB2LedgerReferences } from '../server/b2-ledger.js'
import { PRIVATE_NO_STORE, browserRequestLooksCrossSite, requestBodyTooLarge, safeB2Key } from '../server/api-security.js'

const MAX_REFERENCES = 10000
const required = (name:string) => { const value=process.env[name]; if(!value) throw new Error(`Missing ${name}`); return value }
const awsEncode=(value:string)=>encodeURIComponent(value).replace(/[!'()*]/g,c=>`%${c.charCodeAt(0).toString(16).toUpperCase()}`)
const sha256=(value:string)=>crypto.createHash('sha256').update(value,'utf8').digest('hex')
const hmac=(key:crypto.BinaryLike|crypto.KeyObject,value:string)=>crypto.createHmac('sha256',key).update(value,'utf8').digest()

function signedRequest(method:'GET'|'DELETE', key='', query:Record<string,string>={}) {
  const accessKey=required('B2_KEY_ID'), secretKey=required('B2_APPLICATION_KEY'), bucket=required('B2_BUCKET_NAME')
  const host=required('B2_ENDPOINT').replace(/^https?:\/\//,'').replace(/\/$/,'')
  if(!/^s3\.[^.]+\.backblazeb2\.com$/.test(host)) throw new Error('Invalid B2 endpoint')
  const now=new Date(), amzDate=now.toISOString().replace(/[:-]|\.\d{3}/g,''), dateStamp=amzDate.slice(0,8)
  const scope=`${dateStamp}/us-east-1/s3/aws4_request`
  const canonicalUri=`/${awsEncode(bucket)}${key?`/${awsEncode(key)}`:''}`
  const canonicalQuery=Object.entries(query).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${awsEncode(k)}=${awsEncode(v)}`).join('&')
  const payloadHash=sha256('')
  const canonicalRequest=`${method}\n${canonicalUri}\n${canonicalQuery}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n\nhost;x-amz-content-sha256;x-amz-date\n${payloadHash}`
  const stringToSign=`AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${sha256(canonicalRequest)}`
  const kDate=hmac(Buffer.from(`AWS4${secretKey}`,'utf8'),dateStamp), kRegion=hmac(kDate,'us-east-1'), kService=hmac(kRegion,'s3'), kSigning=hmac(kService,'aws4_request')
  const signature=crypto.createHmac('sha256',kSigning).update(stringToSign,'utf8').digest('hex')
  const authorization=`AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${signature}`
  const url=`https://${host}${canonicalUri}${canonicalQuery?`?${canonicalQuery}`:''}`
  return {url,headers:{Authorization:authorization,'x-amz-date':amzDate,'x-amz-content-sha256':payloadHash}}
}

const xmlDecode=(value:string)=>value.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&')
async function listAttachmentKeys():Promise<string[]> {
  const keys:string[]=[]; let token=''
  const seenTokens = new Set<string>()
  do {
    const query:Record<string,string>={'list-type':'2','max-keys':'1000'}; if(token) query['continuation-token']=token
    const signed=signedRequest('GET','',query), response=await fetch(signed.url,{headers:signed.headers,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10_000)})
    if(!response.ok) throw new Error(`B2 list failed (${response.status})`)
    const xml=await response.text()
    if (!/<ListBucketResult(?:\s[^>]*)?>/.test(xml) || !xml.includes('</ListBucketResult>')) throw new Error('Invalid B2 listing')
    for(const match of xml.matchAll(/<Key>([\s\S]*?)<\/Key>/g)){ const key=xmlDecode(match[1]); if(safeB2Key(key)) keys.push(key) }
    token=xmlDecode(xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/)?.[1]??'')
    if (/<IsTruncated>\s*true\s*<\/IsTruncated>/.test(xml) && !token) throw new Error('Incomplete B2 listing')
    if (token && seenTokens.has(token)) throw new Error('Repeated B2 listing page')
    if (token) seenTokens.add(token)
  } while(token)
  return keys
}

async function deleteKey(key: string): Promise<'deleted'|'missing'> {
  const signed = signedRequest('DELETE', key)
  const response = await fetch(signed.url, { method: 'DELETE', headers: signed.headers, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10_000) })
  if (!response.ok && response.status !== 404) throw new Error('B2 delete failed')
  return response.status === 404 ? 'missing' : 'deleted'
}

export async function POST(request:Request):Promise<Response>{
  try{
    if(browserRequestLooksCrossSite(request)) return Response.json({error:'Cross-site request rejected'},{status:403,headers:PRIVATE_NO_STORE})
    if(requestBodyTooLarge(request,1024*1024)) return Response.json({error:'Request too large'},{status:413,headers:PRIVATE_NO_STORE})
    if(!(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json')) return Response.json({error:'JSON required'},{status:415,headers:PRIVATE_NO_STORE})
    const body:any=await request.json().catch(()=>null), raw=body?.referencedKeys, action=body?.action??'preview'
    if (body && Object.keys(body).some(key => !['action','referencedKeys','orphanKeys'].includes(key))) return Response.json({error:'Invalid GC scope or parameters'},{status:400,headers:PRIVATE_NO_STORE})
    if(!Array.isArray(raw)||raw.length>MAX_REFERENCES) return Response.json({error:'Invalid reference set'},{status:400,headers:PRIVATE_NO_STORE})
    if(action!=='preview'&&action!=='delete') return Response.json({error:'Invalid GC action'},{status:400,headers:PRIVATE_NO_STORE})
    const referenced=new Set<string>()
    for(const value of raw){ if(typeof value!=='string'||!safeB2Key(value)) return Response.json({error:'Invalid attachment key'},{status:400,headers:PRIVATE_NO_STORE}); referenced.add(value) }
    const denied = await authorizeB2(request)
    if (denied) return denied
    const requested = body?.orphanKeys
    if (action === 'delete' && (!Array.isArray(requested) || requested.length > MAX_REFERENCES || requested.some(key => typeof key !== 'string' || !safeB2Key(key)) || new Set(requested).size !== requested.length)) return Response.json({error:'Invalid orphan set'},{status:400,headers:PRIVATE_NO_STORE})
    const cloudReferences = await readB2LedgerReferences(request)
    const remote=await listAttachmentKeys(), remoteSet=new Set(remote)
    const orphans=remote.filter(key=>!referenced.has(key) && !cloudReferences.has(key))
    if (action === 'preview') return Response.json({scanned:remote.length,orphans},{headers:PRIVATE_NO_STORE})
    const deletedKeys: string[] = [], missingKeys: string[] = [], skippedKeys: string[] = []
    const failures: {key:string;error:string}[] = []
    for (const key of requested as string[]) {
      // Only recognized keys actually listed in the server-configured bucket
      // are in scope. A client cannot select an endpoint, bucket or foreign path.
      if (!remoteSet.has(key)) { missingKeys.push(key); continue }
      if (referenced.has(key)) { skippedKeys.push(key); continue }
      let latest: Set<string>
      try { latest = await readB2LedgerReferences(request) }
      catch { failures.push({key,error:'无法重新验证云端引用，未执行删除'}); continue }
      if (latest.has(key)) { skippedKeys.push(key); continue }
      try { if (await deleteKey(key) === 'missing') missingKeys.push(key); else deletedKeys.push(key) }
      catch { failures.push({key,error:'删除未确认成功，请重新扫描或重试'}); }
    }
    const resolved = new Set([...deletedKeys, ...missingKeys])
    const remainingKeys = requested.filter((key: string) => !resolved.has(key))
    return Response.json({scanned:remote.length,deleted:deletedKeys.length,skipped:skippedKeys.length,deletedKeys,missingKeys,skippedKeys,failures,remainingKeys},{headers:PRIVATE_NO_STORE})
  }catch{ return Response.json({error:'B2 清理未完成：无法验证授权、云端引用或存储范围，请重试'},{status:503,headers:PRIVATE_NO_STORE}) }
}
