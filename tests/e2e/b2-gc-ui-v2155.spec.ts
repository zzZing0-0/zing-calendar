import { test, expect } from '@playwright/test'
import { safetyHarness, databaseCall } from '../helpers/safetyHarness'

const keys=['attachment:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','attachment:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb']

for(const outcome of ['success','partial','forbidden','network'] as const){
  test(`manual cleanup ${outcome} keeps preview and confirmation and reports remaining files`,async({page})=>{
    await safetyHarness(page)
    await databaseCall(page,`await db.saveGitHubDeviceCredential('fake-device');await db.putAttachmentBlob('local-unrelated',new Blob(['keep-local']));`)
    let deletes=0,confirmed=false
    const alerts:string[]=[]
    page.on('dialog',async dialog=>{
      if(dialog.type()==='confirm'){confirmed=true;await dialog.accept()}
      else{alerts.push(dialog.message());await dialog.dismiss()}
    })
    await page.route('**/api/b2-gc',async route=>{
      expect(route.request().headers().authorization).toBe('Bearer fake-device')
      const body=route.request().postDataJSON()
      if(body.action==='preview')return route.fulfill({json:{scanned:2,orphans:keys}})
      expect(confirmed).toBe(true);expect(body.orphanKeys).toEqual(keys);deletes++
      if(outcome==='network')return route.abort('failed')
      if(outcome==='forbidden')return route.fulfill({status:403,json:{error:'Attachment access denied'}})
      const success=outcome==='success'
      return route.fulfill({json:{deleted:success?2:1,skipped:0,deletedKeys:success?keys:[keys[0]],missingKeys:[],skippedKeys:[],failures:success?[]:[{key:keys[1],error:'mock failure'}],remainingKeys:success?[]:[keys[1]]}})
    })
    await page.route('**/api/b2-sign?*',route=>route.fulfill({json:{url:'https://b2.mock.invalid/preview'}}))
    await page.route('https://b2.mock.invalid/**',route=>route.fulfill({contentType:'application/octet-stream',body:'fake'}))
    await page.goto('/')
    await page.locator('.bottom-nav').getByRole('button',{name:'设置',exact:true}).click()
    await page.locator('.orphan-cleanup-row').click()
    const dialog=page.getByRole('dialog',{name:'孤儿附件检查'})
    await expect(dialog.locator('.orphan-preview-item')).toHaveCount(2)
    expect(deletes).toBe(0)
    for(const key of keys)await expect(dialog.locator('code').filter({hasText:key})).toBeVisible()
    await dialog.getByRole('button',{name:'永久删除 2 个',exact:true}).click()
    await expect.poll(()=>alerts.length).toBe(1)
    expect(deletes).toBe(1)
    if(outcome==='success'){
      await expect(dialog).toHaveCount(0);expect(alerts[0]).toContain('已清除 2 个');expect(alerts[0]).toContain('剩余 0 个')
    }else if(outcome==='partial'){
      await expect(dialog.locator('.orphan-preview-item')).toHaveCount(1)
      await expect(dialog.locator('code')).toHaveText(keys[1]);expect(alerts[0]).toContain('失败 1 个');expect(alerts[0]).toContain('剩余 1 个')
    }else{
      await expect(dialog.locator('.orphan-preview-item')).toHaveCount(2);expect(alerts[0]).toContain('清理失败')
    }
    expect(await databaseCall(page,`return (await db.getAttachmentBlob('local-unrelated')).text()`)).toBe('keep-local')
  })
}

test('cancelling the existing confirmation never submits a delete request',async({page})=>{
  await safetyHarness(page)
  let deletes=0
  await page.route('**/api/b2-gc',route=>{
    if(route.request().postDataJSON().action==='delete')deletes++
    return route.fulfill({json:{scanned:2,orphans:keys}})
  })
  await page.route('**/api/b2-sign?*',route=>route.fulfill({status:403,json:{error:'mock no preview URL'}}))
  await page.goto('/');await page.locator('.bottom-nav').getByRole('button',{name:'设置',exact:true}).click()
  await page.locator('.orphan-cleanup-row').click()
  const dialog=page.getByRole('dialog',{name:'孤儿附件检查'})
  await expect(dialog.locator('.orphan-preview-item')).toHaveCount(2)
  const confirmation=page.waitForEvent('dialog')
  const click=dialog.getByRole('button',{name:'永久删除 2 个',exact:true}).click()
  const prompt=await confirmation;expect(prompt.type()).toBe('confirm');await prompt.dismiss()
  await click
  await expect(dialog.getByRole('button',{name:'永久删除 2 个',exact:true})).toBeEnabled()
  await expect(dialog.locator('.orphan-preview-item')).toHaveCount(2);expect(deletes).toBe(0)
})
