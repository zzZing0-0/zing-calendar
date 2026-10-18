import { expect,test } from '@playwright/test'
import { fetchWithTimeout } from '../../src/db/request'

test('a stalled request is aborted by its deadline without making a network connection',async()=>{
  const original=globalThis.fetch
  let signal:AbortSignal|undefined
  globalThis.fetch=async(_input,init)=>new Promise((_resolve,reject)=>{
    signal=init?.signal??undefined
    signal?.addEventListener('abort',()=>reject(signal?.reason),{once:true})
  })
  try{
    await expect(fetchWithTimeout('https://isolated.invalid',{},15)).rejects.toThrow()
    expect(signal?.aborted).toBe(true)
    expect(signal?.reason.name).toBe('TimeoutError')
  }finally{globalThis.fetch=original}
})

test('caller cancellation is preserved alongside the timeout signal',async()=>{
  const original=globalThis.fetch
  const controller=new AbortController()
  globalThis.fetch=async(_input,init)=>new Promise((_resolve,reject)=>{
    init?.signal?.addEventListener('abort',()=>reject(init.signal?.reason),{once:true})
  })
  try{
    const pending=fetchWithTimeout('https://isolated.invalid',{signal:controller.signal},1000)
    controller.abort(new Error('caller cancelled'))
    await expect(pending).rejects.toThrow('caller cancelled')
  }finally{globalThis.fetch=original}
})
