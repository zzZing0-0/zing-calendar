import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
const legacy = JSON.parse(readFileSync('tests/fixtures/gacha/v2.15.22-state.json', 'utf8'))

const releaseVersion = JSON.parse(readFileSync('package.json', 'utf8')).version
const key = 'zing-gacha-v1'
async function open(page: Page) {
  await page.locator('.bottom-nav').getByRole('button', { name: '设置', exact: true }).click()
  await page.locator('.settings-link-row').filter({ hasText: '抽奖模拟器' }).click()
  await expect(page.getByRole('dialog', { name: '抽奖模拟器' })).toBeVisible()
  await expect(page.locator('#poolSelect')).toBeVisible()
}
async function start(page: Page, data?: unknown) {
  await page.goto('/')
  if (data !== undefined) await page.evaluate(({ key, data }) => localStorage.setItem(key, typeof data === 'string' ? data : JSON.stringify(data)), { key, data })
  await open(page)
}
async function saved(page: Page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key) }
async function custom(page: Page, n: number) { await page.locator('#customN').fill(String(n)); await page.locator('#customDraw').click() }
async function edit(page: Page) { await page.locator('#editTab').click() }
async function downloadedJSON(page: Page, selector: string) {
  const pending = page.waitForEvent('download'); await page.locator(selector).click()
  const download = await pending
  return JSON.parse(await readFile((await download.path())!, 'utf8'))
}

test('native module opens from settings; wheel keeps its own settings and independent navigation', async ({ page }) => {
  await start(page)
  await expect(page.locator('iframe')).toHaveCount(0)
  await expect(page.locator('.gacha-lab-toolbar')).toContainText('v' + releaseVersion)
  await expect(page.locator('#inventory')).toContainText('还没有获得')
  await expect(page.locator('#collection')).toContainText('未获得')
  await expect(page.locator('#shop')).toContainText('尚未配置兑换规则')
  await page.getByRole('button', { name: '返回日历', exact: true }).click()
  await expect(page.locator('.calendar-card')).toBeVisible()
  await page.locator('.bottom-nav').getByRole('button', { name: '设置', exact: true }).click()
  await page.locator('.settings-link-row').filter({ hasText: '幸运大转盘' }).click()
  await expect(page.locator('.random-feature-overlay')).toBeVisible()
  await page.locator('.random-wheel-settings-button').click()
  await expect(page.locator('.random-feature-overlay').last()).toContainText('幸运池')
})

test('v2.15.22 real browser fixture loads unchanged and remains usable after refresh', async ({ page }) => {
  await start(page, legacy)
  expect(await saved(page)).toEqual(legacy) // Reading must not rewrite old data.
  await expect(page.locator('#drawCount')).toHaveText('累计 1 抽')
  await page.locator('#poolSelect').selectOption(legacy.pools[0].id)
  await expect(page.locator('#collection')).toContainText('重复 49')
  await expect(page.locator('#inventory')).toContainText('徽章 ×244,980')
  await expect(page.locator('#collectionProgress')).toContainText('2/8')
  await expect(page.locator('#shop')).toContainText('余额 244,980')
  await page.locator('[data-draw="1"]').click()
  const after = await saved(page)
  expect(after.pools[0].draws).toBe(51)
  expect(after.pools[0].spent).toBe(3060)
  expect(after.pools[0].redeemedSpent).toEqual(legacy.pools[0].redeemedSpent)
  expect(after.pools[0].tradeGained).toEqual(legacy.pools[0].tradeGained)
  expect(after.pools[0].history).toEqual(legacy.pools[0].history)
  expect(after.pools[1]).toEqual(legacy.pools[1])
  await page.reload(); await open(page)
  expect(await saved(page)).toEqual(after)
  await expect(page.locator('#drawCount')).toHaveText('累计 51 抽')
})

test('legacy versions and to/redeemFrom rules normalize in memory without losing balances or unknown fields', async ({ page }) => {
  const old: any = structuredClone(legacy)
  const p = old.pools[0], config = p.config
  config.trades[0].to = config.trades[0].rewardIds[0]; delete config.trades[0].rewardIds
  p.versions = [{ config }]; delete p.config; delete p.batchStats
  old.active = p.id; old.futureField = { retained: true }
  await start(page, old)
  expect(await saved(page)).toEqual(old)
  await page.locator('[data-draw="1"]').click()
  const next = await saved(page)
  expect(next.futureField).toEqual(old.futureField)
  expect(next.pools[0].versions).toEqual(old.pools[0].versions)
  expect(next.pools[0].config.trades[0].rewardIds).toEqual([config.trades[0].to])
  expect(next.pools[0].redeemedSpent).toEqual(p.redeemedSpent)
  expect(next.pools[0].draws).toBe(51)
  const normalized = await page.evaluate(async config => {
    const { normalizeConfig } = await import('/src/features/gacha-lab/storage.ts')
    const c: any = structuredClone(config); delete c.trades
    c.rewards[0].redeemFrom = c.rewards.at(-1).id; c.rewards[0].redeemCost = 123
    return normalizeConfig(c)
  }, config)
  expect(normalized.trades[0]).toMatchObject({ from: config.rewards.at(-1).id, cost: 123, rewardIds: [config.rewards[0].id], qty: 1, repeat: false })
})

test('custom batches persist, merge, sort numerically and reset only current pool', async ({ page }) => {
  await start(page)
  await custom(page, 40); await custom(page, 20); await custom(page, 40)
  await page.locator('#showProbability').click()
  const rows = page.locator('#probabilityContent .prob-values span:first-child').filter({ hasText: '抽 (' })
  await expect(rows).toHaveText(['1抽 (0轮)', '10抽 (0轮)', '20抽 (1轮)', '40抽 (2轮)', '100抽 (0轮)'])
  await expect(page.locator('#probabilityContent')).toContainText('23.27%')
  await expect(page.locator('#probabilityContent')).toContainText('累计模拟 100 抽')
  await expect(page.locator('#probabilityContent')).toContainText('¥600')
  await page.reload(); await open(page); await page.locator('#showProbability').click()
  await expect(rows).toHaveText(['1抽 (0轮)', '10抽 (0轮)', '20抽 (1轮)', '40抽 (2轮)', '100抽 (0轮)'])
  page.once('dialog', d => d.accept()); await page.locator('#resetPool').click()
  await expect(page.locator('#probabilityContent')).not.toContainText('40抽')
  await expect(page.locator('#probabilityContent')).toContainText('累计模拟 0 抽')
})

test('custom 10 draws merge with standard ten-draw rounds; hundred draws remain separate', async ({ page }) => {
  await start(page); await custom(page, 10); await page.locator('[data-draw="10"]').click(); await page.locator('[data-draw="100"]').click()
  await page.locator('#showProbability').click()
  await expect(page.locator('.prob-comparison').filter({ hasText: /^10抽/ })).toContainText('(2轮)')
  await expect(page.locator('.prob-comparison').filter({ hasText: /^100抽/ })).toContainText('(1轮)')
  await expect(page.locator('#probabilityContent')).toContainText('累计模拟 120 抽')
})

test('pool create, copy, edit, cancel, delete and draw isolate all data', async ({ page }) => {
  await start(page, legacy)
  await edit(page); await page.locator('#copyPool').click()
  const copy = (await saved(page)).pools[2]
  expect(copy.draws).toBe(0); expect(copy.counts).toEqual({}); expect(copy.collection).toEqual({}); expect(copy.batchStats).toEqual({})
  expect(copy.config.name).toContain('（副本）')
  await page.locator('#fName').fill('未保存名字'); await page.locator('#cancelEdit').click()
  await expect(page.locator('#fName')).toHaveValue(copy.config.name)
  await page.locator('#fName').fill('独立奖池'); await page.locator('#savePool').click()
  await expect(page.locator('#saveFeedback')).toHaveText('配置已保存')
  await page.locator('#playTab').click(); await custom(page, 40)
  const next = await saved(page)
  expect(next.pools.slice(0, 2)).toEqual(legacy.pools)
  expect(next.pools[2].draws).toBe(40); expect(next.pools[2].batchStats['40'].rounds).toBe(1)
  await edit(page); await page.locator('#newPool').click(); await expect(page.locator('#fName')).toHaveValue('我的新奖池')
  page.once('dialog', d => d.dismiss()); await page.locator('#deletePool').click(); expect((await saved(page)).pools).toHaveLength(4)
  page.once('dialog', d => d.accept()); await page.locator('#deletePool').click(); expect((await saved(page)).pools).toHaveLength(3)
  await page.locator('#poolManagerList').getByRole('button', { name: '切换/编辑', exact: true }).last().click()
  await expect(page.locator('#fName')).toHaveValue('独立奖池')
})

test('editor live reward targets, probability validation, remaining fill and save feedback behavior', async ({ page }) => {
  await start(page); await edit(page)
  const reward = page.locator('.reward-entry').first()
  await reward.getByLabel('奖励名称', { exact: true }).fill('改名皮肤')
  await page.locator('#addTrade').click(); await page.locator('.trade-picker summary').click()
  await expect(page.locator('.trade-targets')).toContainText('改名皮肤')
  await page.locator('.trade-picker').getByRole('button', { name: '完成', exact: true }).click()
  await reward.getByLabel('概率百分比').fill('20')
  await page.locator('#savePool').click(); await expect(page.locator('#saveFeedback')).toContainText('概率总和')
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBeNull()
  await reward.getByRole('button', { name: '将剩余概率填入改名皮肤' }).click()
  await page.locator('#savePool').click(); await expect(page.locator('#saveFeedback')).toHaveText('配置已保存')
  await expect(page.locator('#saveFeedback')).toBeHidden({ timeout: 5000 })
  await page.locator('#addReward').click(); const added = page.locator('.reward-entry').last()
  await added.getByLabel('奖励名称', { exact: true }).fill('实时新奖励')
  await page.locator('.trade-picker summary').click(); await expect(page.locator('.trade-targets')).toContainText('实时新奖励')
  await added.getByRole('button', { name: '删除实时新奖励', exact: true }).click()
  await expect(page.locator('.trade-targets')).not.toContainText('实时新奖励')
})

test('mobile editor cards alternate visibly and controls stay within viewport with accessible probability toggle', async ({ page }) => {
  await start(page); await edit(page); await page.locator('#addTrade').click(); await page.locator('#addTrade').click()
  for (const selector of ['.reward-entry', '.trade-row']) {
    const colors = await page.locator(selector).evaluateAll(rows => rows.slice(0,2).map(r => getComputedStyle(r).backgroundColor))
    expect(colors).toEqual(['rgb(245, 241, 255)', 'rgb(53, 37, 79)'])
  }
  expect(await page.locator('.gacha-lab-content').evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true)
  await page.locator('#playTab').click()
  const customBox=await page.locator('#customN').boundingBox(), reset=await page.locator('#resetPool').boundingBox()
  expect(customBox!.y).toBe(reset!.y)
  await expect(page.locator('#showProbability')).toHaveAttribute('aria-expanded', 'false')
  await page.locator('#showProbability').click(); await expect(page.locator('#probabilityAside')).toBeVisible()
  await page.locator('#showProbability').click(); await expect(page.locator('#probabilityAside')).toBeHidden()
})

test('JSON exports round trip config and full backup, confirmation cancel preserves all data', async ({ page }) => {
  await start(page, legacy); await edit(page)
  await expect(page.locator('#importFile')).toBeHidden()
  const config = await downloadedJSON(page, '#exportConfig'), backup = await downloadedJSON(page, '#exportBackup')
  expect(config).toEqual({ type: 'zing-gacha-config', schema: 1, config: legacy.pools[1].config })
  expect(backup).toEqual({ type: 'zing-gacha-backup', schema: 1, state: legacy })
  const upload = (value: unknown) => page.locator('#importFile').setInputFiles({ name: 'gacha.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)) })
  page.once('dialog', d => d.dismiss()); await upload(backup); expect(await saved(page)).toEqual(legacy)
  page.once('dialog', d => d.dismiss()); await upload(config)
  const next = await saved(page)
  expect(next.pools).toHaveLength(3); expect(next.pools[2].draws).toBe(0); expect(next.pools.slice(0,2)).toEqual(legacy.pools)
  page.once('dialog', d => d.accept()); await upload(backup); expect(await saved(page)).toEqual(legacy)
  await expect(page.locator('#fName')).toHaveValue(legacy.pools[1].config.name)
  page.once('dialog', d => d.accept()); await upload(config)
  const overwritten = await saved(page)
  expect(overwritten.pools).toHaveLength(2); expect(overwritten.pools[1].id).toBe(legacy.pools[1].id); expect(overwritten.pools[1].draws).toBe(0)
  expect(overwritten.pools[0]).toEqual(legacy.pools[0])
  await upload({ type: 'zing-gacha-config', config: { ...config.config, rewards: [] } })
  await expect(page.locator('#saveFeedback')).toContainText('导入失败')
  expect(await saved(page)).toEqual(overwritten)
  await page.locator('#importFile').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{bad') })
  await expect(page.locator('#saveFeedback')).toContainText('导入失败')
  expect(await saved(page)).toEqual(overwritten)
})

test('shop confirms cost, prevents insufficient balance, blocks owned collectibles and respects repeat', async ({ page }) => {
  const data = structuredClone(legacy); data.active = data.pools[0].id
  await start(page, data)
  page.once('dialog', d => d.dismiss()); await page.locator('[data-shop]').click(); expect(await saved(page)).toEqual(data)
  page.once('dialog', d => d.accept()); await page.locator('[data-shop]').click()
  const next = await saved(page), t = data.pools[0].config.trades[0]
  expect(next.pools[0].redeemedSpent[t.from]).toBe(40)
  expect(next.pools[0].duplicates[t.rewardIds[0]]).toBe(3)
  expect(next.pools[0].converted).toEqual(data.pools[0].converted)
  await edit(page); await page.getByLabel('已收藏后', { exact: true }).selectOption('false'); await page.locator('#savePool').click(); await page.locator('#playTab').click()
  await expect(page.locator('[data-shop]')).toBeDisabled(); await expect(page.locator('[data-shop]')).toHaveText('已收藏')
  await page.locator('#poolSelect').selectOption(data.pools[1].id)
  await expect(page.locator('[data-shop]')).toBeDisabled(); await expect(page.locator('[data-shop]')).toHaveText('材料不足')
})

for (const bad of ['{broken', JSON.stringify({ active: 'x', pools: [{ id: 'x' }] })]) {
  test(`invalid stored data is never overwritten and raw backup plus recovery work (${bad.slice(0,10)})`, async ({ page }) => {
    await page.goto('/'); await page.evaluate(({key,bad}) => localStorage.setItem(key,bad), {key,bad})
    await page.locator('.bottom-nav').getByRole('button', {name:'设置',exact:true}).click()
    await page.locator('.settings-link-row').filter({hasText:'抽奖模拟器'}).click()
    await expect(page.getByRole('alert')).toContainText('原始数据已保留')
    expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(bad)
    const pending=page.waitForEvent('download');await page.getByRole('button',{name:'导出原始数据'}).click()
    expect(await readFile((await (await pending).path())!,'utf8')).toBe(bad)
    await page.getByRole('button',{name:'重试加载'}).click();await expect(page.getByRole('alert')).toBeVisible()
    await page.evaluate(({key,legacy})=>localStorage.setItem(key,JSON.stringify(legacy)),{key,legacy})
    await page.getByRole('button',{name:'重试加载'}).click();await expect(page.locator('#poolSelect')).toBeVisible()
    await page.getByRole('button',{name:'返回日历',exact:true}).click();await expect(page.locator('.calendar-card')).toBeVisible()
  })
}

test('quota failures and concurrent tab writes preserve original durable state', async ({ page }) => {
  await start(page,legacy)
  await page.evaluate(()=>{const original=Storage.prototype.setItem; (window as any).restoreStorage=()=>Storage.prototype.setItem=original;Storage.prototype.setItem=function(k,v){if(k==='zing-gacha-v1')throw new DOMException('quota','QuotaExceededError');return original.call(this,k,v)}})
  await page.locator('[data-draw="1"]').click();await expect(page.locator('#message')).toContainText('原始数据已保留')
  expect(await saved(page)).toEqual(legacy);await expect(page.locator('#drawCount')).toHaveText('累计 1 抽')
  await page.evaluate(({key,legacy})=>{(window as any).restoreStorage();localStorage.setItem(key,JSON.stringify({...legacy,anotherTab:true}))},{key,legacy})
  await page.locator('[data-draw="1"]').click();await expect(page.locator('#message')).toContainText('其他页面已修改奖池')
  expect(await saved(page)).toEqual({...legacy,anotherTab:true})
})

test('render exception keeps host return button reachable and recovers safely', async ({ page }) => {
  await page.route('**/src/features/gacha-lab/GachaLabContent.tsx*', route=>route.fulfill({contentType:'application/javascript',body:'export function GachaLabContent(){throw new Error("isolated render failure")}' }))
  await page.goto('/');await page.locator('.bottom-nav').getByRole('button',{name:'设置',exact:true}).click()
  await page.locator('.settings-link-row').filter({hasText:'抽奖模拟器'}).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.locator('.gacha-lab-toolbar').getByRole('button',{name:'返回日历'})).toBeInViewport()
  await page.locator('.gacha-lab-toolbar').getByRole('button',{name:'返回日历'}).click()
  await expect(page.locator('.calendar-card')).toBeVisible()
})

test('mobile PWA navigation remains above scroll content and calendar browsing state survives return', async ({ page }) => {
  await page.goto('/')
  const before = await page.locator('.calendar-card').innerText()
  await open(page); await edit(page)
  await page.locator('.gacha-lab-content').evaluate(e=>e.scrollTop=e.scrollHeight)
  const button=page.locator('.gacha-lab-toolbar').getByRole('button',{name:'返回日历',exact:true})
  await expect(button).toBeInViewport()
  const rect=await button.boundingBox();expect(rect!.y).toBeLessThan(100)
  expect(await button.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})).toBe(true)
  await button.click();await expect(page.locator('.calendar-card')).toBeVisible()
  expect(await page.locator('.calendar-card').innerText()).toBe(before)
  expect(await page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden')
  await open(page);await page.keyboard.press('Escape');await expect(page.locator('.calendar-card')).toBeVisible()
})

test('missing AudioContext never blocks a draw', async ({ page }) => {
  await start(page)
  await page.evaluate(()=>{(window as any).AudioContext=undefined;(window as any).webkitAudioContext=undefined})
  await page.locator('[data-draw="1"]').click();await expect(page.locator('#drawCount')).toHaveText('累计 1 抽')
})

test('integer weighted selection, closed quantity boundaries, duplicates and probability edge cases', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { drawOne, performDraw } = await import('/src/domain/gacha/draw.ts')
    const { validate } = await import('/src/domain/gacha/validation.ts')
    const { makePool } = await import('/src/domain/gacha/defaults.ts')
    const { probabilityRows } = await import('/src/domain/gacha/statistics.ts')
    const { sample } = await import('/src/domain/gacha/defaults.ts')
    const c=sample(); const base=c.rewards[0]
    c.rewards=[{...base,id:'a',p:25,min:2,max:4,convertTo:'b',convertAmount:5},{...base,id:'b',p:75,min:1,max:1,collect:false,duplicate:'keep'}];c.trades=[]
    const roll=(x:number,y:number)=>{let i=0;return drawOne(c,()=>[x,y][i++])}
    const draws=[roll(0,0),roll(.249999999,.999999999),roll(.25,0),roll(.999999999,0)]
    const p=makePool(c),record=performDraw(p,2,()=>0)
    const stats=probabilityRows(p)
    const bad=[]
    for(const patch of [{p:24.9999999},{p:-1},{min:0},{max:100001},{min:5,max:4},{convertTo:'missing'},{convertAmount:-1}]){const x=structuredClone(c);Object.assign(x.rewards[0],patch);bad.push(validate(x))}
    const nBad=[];for(const n of [0,-1,1.5,10001,NaN]){try{performDraw(makePool(c),n,()=>0);nBad.push(false)}catch{nBad.push(true)}}
    const zero=makePool(c);zero.config.rewards[0].p=0;zero.config.rewards[1].p=100
    const one=makePool(c);one.config.rewards[0].p=100;one.config.rewards[1].p=0
    return {draws:draws.map(x=>({id:x!.reward.id,qty:x!.qty})),record,p,stats,bad,nBad,zero:probabilityRows(zero),one:probabilityRows(one),large:performDraw(makePool(c),10000,()=>.999999999).n}
  })
  expect(result.draws).toEqual([{id:'a',qty:2},{id:'a',qty:4},{id:'b',qty:1},{id:'b',qty:1}])
  expect(result.record).toMatchObject({n:2,got:{a:4},dup:{a:3},converted:{b:15},newCollected:['a'],cost:120})
  expect(result.p).toMatchObject({draws:2,spent:120,counts:{a:4},collection:{a:true},duplicates:{a:3},converted:{b:15},batchStats:{'2':{rounds:1,hits:1}}})
  expect(result.stats.find(x=>x.n===2)).toMatchObject({observed:1})
  expect(result.stats.find(x=>x.n===2)?.theoretical).toBeCloseTo(.4375,12)
  expect(result.bad.every(Boolean)).toBe(true);expect(result.nBad).toEqual([true,true,true,true,true]);expect(result.large).toBe(10000)
  expect(result.zero.every(x=>x.theoretical===0)).toBe(true);expect(result.one.every(x=>x.theoretical===1)).toBe(true)
})

test('shop quantity, material balances, keep duplicates and invalid trade boundaries retain legacy semantics', async ({ page }) => {
  await page.goto('/')
  const result=await page.evaluate(async()=>{
    const {redeem}=await import('/src/domain/gacha/trades.ts'),{balance}=await import('/src/domain/gacha/inventory.ts'),{performDraw}=await import('/src/domain/gacha/draw.ts'),{validate}=await import('/src/domain/gacha/validation.ts'),{makePool,sample}=await import('/src/domain/gacha/defaults.ts')
    const c=sample(),p=makePool(c),a=c.rewards[0],b=c.rewards.at(-1)!,non=c.rewards.find(r=>!r.collect)!
    p.config.trades=[{id:'t',from:b.id,cost:20,rewardIds:[a.id,non.id],qty:3,repeat:false}]
    p.counts[b.id]=15;p.converted[b.id]=10;p.tradeGained={[b.id]:5};p.redeemedSpent={[b.id]:10}
    redeem(p,'t',a.id)
    const errors=[];for(const id of ['missing',a.id]){try{redeem(p,'t',id);errors.push(false)}catch{errors.push(true)}}
    const after={owned:p.collection[a.id],dups:p.duplicates[a.id],converted:p.converted[b.id],spent:p.redeemedSpent[b.id],balance:balance(p,b.id)}
    p.counts[b.id]+=20;p.config.trades[0].rewardIds=[non.id];redeem(p,'t',non.id)
    const invalid=[];for(const patch of [{cost:0},{cost:1.5},{qty:0},{qty:100001},{rewardIds:[]},{rewardIds:[b.id]},{from:a.id}]){const copy=structuredClone(p.config);Object.assign(copy.trades[0],patch);invalid.push(validate(copy))}
    const keep=makePool(c);keep.config.rewards.forEach(r=>r.p=0);keep.config.rewards[0].p=100;keep.config.rewards[0].duplicate='keep';performDraw(keep,2,()=>0)
    return {after,errors,gained:p.tradeGained[non.id],invalid,keep:{dups:keep.duplicates[a.id],converted:keep.converted}}
  })
  expect(result.after).toEqual({owned:true,dups:2,converted:10,spent:30,balance:0})
  expect(result.errors).toEqual([true,true]);expect(result.gained).toBe(3);expect(result.invalid.every(Boolean)).toBe(true);expect(result.keep).toEqual({dups:1,converted:{}})
})

test('loading or failed feature chunk cannot trap the PWA inside Gacha Lab', async ({ page }) => {
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/src/features/gacha-lab/GachaLabContent.tsx*', async route => { await gate; await route.abort('failed') })
  await page.goto('/'); await page.locator('.bottom-nav').getByRole('button',{name:'设置',exact:true}).click()
  await page.locator('.settings-link-row').filter({hasText:'抽奖模拟器'}).click()
  const back=page.locator('.gacha-lab-toolbar').getByRole('button',{name:'返回日历',exact:true})
  await expect(back).toBeInViewport();await expect(page.locator('.gacha-lab-content')).toContainText('正在加载')
  release();await expect(page.getByRole('alert')).toBeVisible();await expect(back).toBeInViewport()
  await back.click();await expect(page.locator('.calendar-card')).toBeVisible()
})

test('desktop probability reference stays visible and editor has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({width:1720,height:1000});await page.goto('/')
  await page.getByRole('navigation',{name:'电脑端导航'}).getByRole('button',{name:'设置',exact:true}).click()
  await page.locator('.settings-link-row').filter({hasText:'抽奖模拟器'}).click()
  await expect(page.locator('#probabilityAside')).toBeVisible()
  await page.locator('[data-draw="1"]').click();await expect(page.locator('#probabilityContent')).toContainText('1抽 (1轮)')
  await edit(page);await expect(page.locator('#probabilityAside')).toHaveCount(0)
  expect(await page.locator('.gacha-lab-content').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true)
  await expect(page.locator('.gacha-lab-toolbar').getByRole('button',{name:'返回日历'})).toBeInViewport()
})

test('draw audio uses v2.15.22 noise filter and gain timings, then releases context on exit', async ({ page }) => {
  await start(page)
  await page.evaluate(()=>{
    const calls: unknown[][]=[];(window as any).audioCalls=calls
    const parameter=(name:string)=>({setValueAtTime:(...v:unknown[])=>calls.push([name,'set',...v]),exponentialRampToValueAtTime:(...v:unknown[])=>calls.push([name,'exp',...v]),linearRampToValueAtTime:(...v:unknown[])=>calls.push([name,'linear',...v])})
    const connect=()=>{}
    ;(window as any).AudioContext=class {
      state='suspended';currentTime=1;sampleRate=1000;destination={}
      async resume(){calls.push(['resume']);this.state='running'}
      async close(){calls.push(['close'])}
      createBuffer(...args:unknown[]){calls.push(['buffer',...args]);return {getChannelData:()=>new Float32Array(190)}}
      createBufferSource(){return {connect,start:(t:number)=>calls.push(['start',t]),stop:(t:number)=>calls.push(['stop',t])}}
      createBiquadFilter(){return {connect,Q:{value:0},frequency:parameter('frequency')}}
      createGain(){return {connect,gain:parameter('gain')}}
    }
  })
  await page.locator('[data-draw="1"]').click()
  const calls=await page.evaluate(()=>(window as any).audioCalls)
  expect(calls).toEqual([['resume'],['buffer',1,190,1000],['frequency','set',2600,1.008],['frequency','exp',450,1.198],['gain','set',.0001,1.008],['gain','linear',.12,1.033],['gain','exp',.0001,1.198],['start',1.008],['stop',1.198]])
  await page.getByRole('button',{name:'返回日历',exact:true}).click()
  expect(await page.evaluate(()=>(window as any).audioCalls.at(-1))).toEqual(['close'])
})

test('Gacha operations leave calendar IndexedDB records and schema untouched', async ({ page }) => {
  await page.goto('/')
  const snapshot = () => page.evaluate(async()=>{
    const db:IDBDatabase=await new Promise((resolve,reject)=>{const r=indexedDB.open('zing-calendar');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})
    const names=Array.from(db.objectStoreNames),tx=db.transaction(names,'readonly')
    const rows=await Promise.all(names.map(name=>new Promise(resolve=>{const r=tx.objectStore(name).getAll();r.onsuccess=()=>resolve([name,r.result])})))
    const result={version:db.version,rows};db.close();return result
  })
  await expect(page.locator('.calendar-card')).toBeVisible()
  // The empty install writes default notebook/tags asynchronously. Establish the
  // baseline after their real persistence has completed, before opening Gacha.
  await expect.poll(async () => {
    const snap = await snapshot()
    return (snap.rows.find((row: any) => row[0] === 'syncChanges') as any)[1].length
  }).toBeGreaterThanOrEqual(6)
  const before=await snapshot()
  await open(page);await custom(page,40);await edit(page);await page.locator('#copyPool').click()
  await page.getByRole('button',{name:'返回日历',exact:true}).click()
  expect(await snapshot()).toEqual(before)
})

test('delayed JSON file reading cannot overwrite a pool created while the file is loading', async ({ page }) => {
  await start(page,legacy);await edit(page)
  await page.evaluate(()=>{
    const original=File.prototype.text
    File.prototype.text=function(){return new Promise(resolve=>{(window as any).finishFile=async()=>resolve(await original.call(this))})}
  })
  await page.locator('#importFile').setInputFiles({name:'config.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({type:'zing-gacha-config',schema:1,config:legacy.pools[1].config}))})
  await page.locator('#newPool').click()
  const added=(await saved(page)).pools[2]
  page.once('dialog',d=>d.dismiss());await page.evaluate(()=>(window as any).finishFile())
  await expect(page.locator('#saveFeedback')).toHaveText('导入成功')
  const after=await saved(page)
  expect(after.pools).toHaveLength(4)
  expect(after.pools.slice(0,2)).toEqual(legacy.pools)
  expect(after.pools[2]).toEqual(added)
  expect(after.pools[3].config.name).toBe(legacy.pools[1].config.name)
})

test('multi-target shop preserves imported option order and redeems only the chosen item', async ({ page }) => {
  const data=structuredClone(legacy),p=data.pools[0],a=p.config.rewards[0],b=p.config.rewards[1]
  data.active=p.id;p.config.trades[0].rewardIds=[b.id,a.id]
  await start(page,data);await page.locator('.shop-picker summary').click()
  await expect(page.locator('.shop-choice>span')).toHaveText([b.name+' ×2',a.name+' ×2'])
  page.once('dialog',d=>d.accept());await page.locator('.shop-choice').last().getByRole('button',{name:'兑换',exact:true}).click()
  const next=(await saved(page)).pools[0]
  expect(next.duplicates[b.id]).toBe(p.duplicates[b.id])
  expect(next.duplicates[a.id]).toBe(p.duplicates[a.id]+2)
  expect(next.redeemedSpent[p.config.trades[0].from]).toBe(40)
})

test('editing config keeps the already displayed draw result names and cost snapshot', async ({ page }) => {
  await start(page);await page.evaluate(()=>{Math.random=()=>0});await page.locator('[data-draw="1"]').click()
  const result=await page.locator('#results').innerText()
  await edit(page);await page.locator('.reward-entry').first().getByLabel('奖励名称',{exact:true}).fill('改名之后')
  await page.locator('#fCurrency').fill('新货币');await page.locator('#fRate').fill('2');await page.locator('#savePool').click()
  await page.locator('#playTab').click()
  expect(await page.locator('#results').innerText()).toBe(result)
  await expect(page.locator('#priceLabel')).toContainText('新货币')
})


test('bulk shop redemption spends and grants atomically with safe quantity limits', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { redeem } = await import('/src/domain/gacha/trades.ts')
    const { makePool, sample } = await import('/src/domain/gacha/defaults.ts')
    const { balance } = await import('/src/domain/gacha/inventory.ts')
    const c = sample(), source = c.rewards.find(r => r.name === '徽章')!, target = c.rewards.find(r => r.name === '女巫碎片')!
    c.trades = [{ id:'bulk', from:source.id, cost:100, rewardIds:[target.id], qty:1, repeat:true }]
    const p = makePool(c)
    p.counts[source.id] = 50000
    redeem(p,'bulk',target.id,500)
    const after = { spent:p.redeemedSpent![source.id], gained:p.tradeGained![target.id], remaining:balance(p,source.id) }
    const snapshot = structuredClone(p)
    const invalid = []
    for (const times of [0,-1,1.5,501,Number.MAX_SAFE_INTEGER,NaN]) {
      try { redeem(p,'bulk',target.id,times);invalid.push(false) } catch { invalid.push(true) }
    }
    return { after, invalid, unchanged:JSON.stringify(p)===JSON.stringify(snapshot) }
  })
  expect(result.after).toEqual({spent:50000,gained:500,remaining:0})
  expect(result.invalid).toEqual([true,true,true,true,true,true])
  expect(result.unchanged).toBe(true)
})

test('shop supports selecting 500 redemptions in one confirmed action', async ({ page }) => {
  const data=structuredClone(legacy),p=data.pools[0]
  const t=p.config.trades[0]
  const source=p.config.rewards.find(r=>r.id===t.from)!
  const target=p.config.rewards.find(r=>!r.collect && r.id!==source.id)!
  t.rewardIds=[target.id];t.cost=100;t.qty=1;t.repeat=true
  p.counts[source.id]=50000;p.redeemedSpent={};p.converted={};p.tradeGained={}
  // The legacy fixture defaults to pool[1]. Explicitly activate the modified pool.
  data.active=p.id
  await start(page,data)
  await expect(page.locator('#poolSelect')).toHaveValue(p.id)
  await expect(page.locator('#shop')).toContainText('余额 50,000')
  await page.getByRole('spinbutton',{name:`兑换次数：${target.name}`}).fill('500')
  page.once('dialog',d=>{expect(d.message()).toContain('50000');d.accept()})
  await page.locator(`[data-shop="${t.id}"][data-reward="${target.id}"]`).click()
  const next=(await saved(page)).pools[0]
  expect(next.redeemedSpent[source.id]).toBe(50000)
  expect(next.tradeGained[target.id]).toBe(500)
})
