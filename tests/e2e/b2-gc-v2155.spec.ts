import { test, expect } from '@playwright/test'
import { POST } from '../../api/b2-gc'
import { b2CleanupResult } from '../../src/features/attachments/b2CleanupResult'
import { mockB2Authorization } from '../helpers/b2AuthorizationMock'

const keys = ['a','b','c','d'].map(letter=>`attachment:${letter.repeat(8)}-${letter.repeat(4)}-${letter.repeat(4)}-${letter.repeat(4)}-${letter.repeat(12)}`)
const req = (action='delete', orphanKeys=keys, referencedKeys:string[]=[], extra:Record<string,unknown>={}, token=true) => new Request('https://zing.example/api/b2-gc',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer fake-device'}:{})},body:JSON.stringify({action,orphanKeys,referencedKeys,...extra})})
const attachment = (key:string)=>({storageKey:key,type:'image'})
const record = (entityType:string,payload:any)=>({entityType,entityId:payload.id,payload,updatedAt:'2026-10-18T10:00:00.000Z'})

function fixture(options: { records?:(read:number)=>any[]; delete?:(key:string)=>Response|Promise<Response>; ledgerStatus?:number; listStatus?:number; malformed?:boolean; userId?:number }={}) {
  const disposeAuth=mockB2Authorization()
  const names=['B2_KEY_ID','B2_APPLICATION_KEY','B2_BUCKET_NAME','B2_ENDPOINT']
  const old=names.map(name=>process.env[name])
  Object.assign(process.env,{B2_KEY_ID:'fake-id',B2_APPLICATION_KEY:'fake-secret',B2_BUCKET_NAME:'isolated-owner-bucket',B2_ENDPOINT:'s3.us-west-004.backblazeb2.com'})
  const deletes:string[]=[],calls:string[]=[]
  let reads=0
  globalThis.fetch=(async(input,init={})=>{
    const url=new URL(String(input));calls.push(url.href)
    expect(init.redirect).toBe('error');expect(init.signal).toBeTruthy()
    if(url.origin==='https://api.github.com'){
      expect(new Headers(init.headers).get('authorization')).toBe('Bearer fake-device')
      if(url.pathname==='/user')return Response.json({id:options.userId??123})
      if(url.pathname==='/repos/fixture/ledger')return Response.json({id:456,full_name:'fixture/ledger',private:true,permissions:{push:true}})
      if(url.pathname==='/repos/fixture/ledger/contents/zing/sync-bundle.json'){
        expect(url.searchParams.get('ref')).toBe('main');reads++
        if(options.ledgerStatus)return new Response('private upstream error',{status:options.ledgerStatus})
        return Response.json({type:'file',sha:'a'.repeat(40),encoding:'base64',content:Buffer.from(JSON.stringify({protocolVersion:1,records:options.records?.(reads)??[],tombstones:[]})).toString('base64')})
      }
      throw new Error('Unexpected GitHub path')
    }
    expect(url.origin).toBe('https://s3.us-west-004.backblazeb2.com')
    if(init.method==='DELETE'){
      expect(url.search).toBe('')
      const key=decodeURIComponent(url.pathname.slice('/isolated-owner-bucket/'.length))
      expect(keys).toContain(key);expect(url.pathname).toBe(`/isolated-owner-bucket/${encodeURIComponent(key)}`)
      deletes.push(key)
      return options.delete?.(key)??new Response(null,{status:204})
    }
    expect(url.pathname).toBe('/isolated-owner-bucket')
    return new Response(options.malformed?'<Error>bad</Error>':`<ListBucketResult>${keys.map(key=>`<Contents><Key>${key}</Key></Contents>`).join('')}<Contents><Key>unrelated.txt</Key></Contents></ListBucketResult>`,{status:options.listStatus??200})
  }) as typeof fetch
  return {deletes,calls,dispose(){disposeAuth();names.forEach((name,i)=>{if(old[i]===undefined)delete process.env[name];else process.env[name]=old[i]})}}
}

test('preview is read-only and protects cloud notes, trash and recurring exceptions omitted by a stale client',async()=>{
  const mock=fixture({records:()=>[
    record('note',{id:'note',trashedAt:'2026-10-18',attachments:[attachment(keys[0])]}),
    record('task',{id:'series',recurrenceExceptions:{'2026-10-18':{attachments:[attachment(keys[1])]}}}),
    record('journal',{id:'journal',attachments:[attachment(keys[2])]})]})
  try{
    const preview=await POST(req('preview'))
    expect(preview.status).toBe(200);expect(await preview.json()).toEqual({scanned:4,orphans:[keys[3]]});expect(mock.deletes).toEqual([])
    const result=await POST(req());expect(result.status).toBe(200)
    expect(await result.json()).toMatchObject({deleted:1,skipped:3,deletedKeys:[keys[3]],remainingKeys:keys.slice(0,3)})
    expect(mock.deletes).toEqual([keys[3]])
  }finally{mock.dispose()}
})

test('authorized reviewed orphans are deleted only from the pinned bucket and report full success',async()=>{
  const mock=fixture()
  try{
    expect((await POST(req('preview'))).status).toBe(200);expect(mock.deletes).toEqual([])
    const response=await POST(req());const body=await response.json()
    expect(response.status).toBe(200);expect(body).toMatchObject({deleted:4,skipped:0,deletedKeys:keys,failures:[],remainingKeys:[]})
    expect(mock.deletes).toEqual(keys)
    expect(b2CleanupResult(body,keys).remaining.size).toBe(0)
  }finally{mock.dispose()}
})

test('new cloud references acquired after preview and between individual deletes are skipped',async()=>{
  const mock=fixture({records:read=>read>=4?[record('note',{id:'gained',attachments:[attachment(keys[1])]})]:[]})
  try{
    await POST(req('preview'))
    const response=await POST(req('delete',keys.slice(0,2)));const body=await response.json()
    expect(body).toMatchObject({deletedKeys:[keys[0]],skippedKeys:[keys[1]],remainingKeys:[keys[1]]})
    expect(mock.deletes).toEqual([keys[0]])
  }finally{mock.dispose()}
})

test('partial upstream failures and timeouts retain unresolved files and allow explicit retry',async()=>{
  let retry=false
  const mock=fixture({delete:key=>{
    if(!retry&&key===keys[1])return new Response(null,{status:503})
    if(!retry&&key===keys[2])throw new DOMException('private transport diagnostic','TimeoutError')
    return new Response(null,{status:204})
  }})
  try{
    const response=await POST(req());const body=await response.json()
    expect(body).toMatchObject({deletedKeys:[keys[0],keys[3]],remainingKeys:[keys[1],keys[2]]})
    expect(body.failures.map((row:any)=>row.key)).toEqual([keys[1],keys[2]])
    expect(JSON.stringify(body)).not.toContain('private transport')
    const summary=b2CleanupResult(body,keys)
    expect([...summary.remaining]).toEqual([keys[1],keys[2]]);expect(summary.message).toContain('失败 2 个')
    retry=true
    const retried=await POST(req('delete',[keys[1],keys[2]]));expect(await retried.json()).toMatchObject({deleted:2,failures:[],remainingKeys:[]})
  }finally{mock.dispose()}
})

test('an unlisted foreign key is never sent to DELETE and B2 404 is reported as already absent',async()=>{
  const foreign='attachment:eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
  const mock=fixture({delete:()=>new Response(null,{status:404})})
  try{
    const body=await(await POST(req('delete',[foreign,keys[0]]))).json()
    expect(body).toMatchObject({deleted:0,missingKeys:[foreign,keys[0]],remainingKeys:[]});expect(mock.deletes).toEqual([keys[0]])
  }finally{mock.dispose()}
})

for(const kind of ['no-token','wrong-user','bucket-override','invalid-key','duplicate-key','ledger-404','ledger-403','list-500','bad-xml'] as const){
  test(`${kind} cannot delete any object`,async()=>{
    const mock=fixture({userId:kind==='wrong-user'?999:123,ledgerStatus:kind==='ledger-404'?404:kind==='ledger-403'?403:undefined,listStatus:kind==='list-500'?500:undefined,malformed:kind==='bad-xml'})
    try{
      const response=await POST(req('delete',kind==='invalid-key'?['../foreign']:kind==='duplicate-key'?[keys[0],keys[0]]:keys,[],kind==='bucket-override'?{bucket:'someone-else'}:{},kind!=='no-token'))
      expect(response.status).toBe(kind==='no-token'?401:kind==='wrong-user'?403:['bucket-override','invalid-key','duplicate-key'].includes(kind)?400:503)
      expect(mock.deletes).toEqual([])
    }finally{mock.dispose()}
  })
}

test('loss of reference verification during deletion fails individual files without deleting them',async()=>{
  const mock=fixture({records:read=>{if(read>1)throw new Error('lost ledger');return[]}})
  try{
    const body=await(await POST(req('delete',keys.slice(0,2)))).json()
    expect(body.failures).toHaveLength(2);expect(body.remainingKeys).toEqual(keys.slice(0,2));expect(mock.deletes).toEqual([])
  }finally{mock.dispose()}
})

test('ambiguous or malformed delete results cannot clear the reviewed UI list',()=>{
  for(const body of [{deleted:4},{deleted:1,skipped:0,deletedKeys:[keys[0]],missingKeys:[],skippedKeys:[],failures:[]},{deleted:4,skipped:0,deletedKeys:[...keys,keys[0]],missingKeys:[],skippedKeys:[],failures:[]}]){
    expect(()=>b2CleanupResult(body,keys)).toThrow()
  }
})
