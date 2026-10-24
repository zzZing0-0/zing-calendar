import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const read = (path: string) => readFile(path, 'utf8')

test('Gacha Lab is linked from settings and mounted independently from Lucky Wheel', async () => {
  const [app, settings, workspace, page] = await Promise.all([
    read('src/App.tsx'), read('src/features/settings/SettingsPage.tsx'),
    read('src/features/random-wheel/RandomWorkspace.tsx'), read('src/features/gacha-lab/GachaLabPage.tsx'),
  ])
  expect(settings).toContain('<strong>抽奖模拟器</strong>')
  expect(settings).toContain('setGachaLabOpen(true)')
  expect(workspace).toContain('gachaLabOpen && <GachaLabPage')
  expect(workspace).toContain('<RandomWheelPage')
  expect(app).toContain('!gachaLabOpen')
  expect(page).toContain('src="/gacha-lab/index.html"')
})

test('standalone simulator includes actual and theoretical probability, shop and isolated storage', async () => {
  const html = await read('public/gacha-lab/index.html')
  expect(html).toContain('zing-gacha-v1')
  expect(html).toContain('probabilityAside')
  expect(html).toContain('batchStats')
  expect(html).toContain('理论 vs 实际')
  expect(html).toContain('id="shop"')
  expect(html).toContain('id="collection"')
})

test('wheel owns its settings, and simulator has a compact mobile probability control', async () => {
  const [settings, workspace, wheel, gacha, html] = await Promise.all([
    read('src/features/settings/SettingsPage.tsx'),
    read('src/features/random-wheel/RandomWorkspace.tsx'),
    read('src/features/random-wheel/RandomWheelPage.tsx'),
    read('src/features/gacha-lab/GachaLabPage.tsx'),
    read('public/gacha-lab/index.html'),
  ])
  expect(settings).toContain('<strong>幸运大转盘</strong>')
  expect(settings).not.toContain('<strong>幸运池</strong>')
  expect(workspace).toContain('onSettings={()=>setRandomPoolOpen(true)}')
  expect(wheel).toContain('onClick={onSettings}>⚙️ 设置')
  expect(gacha).toContain('‹ 返回</Button>')
  expect(gacha).not.toContain('返回幸运池')
  expect(html).not.toContain('本地运行')
  expect(html).not.toContain('id="soundToggle"')
  expect(html).toContain('id="showProbability"')
  expect(html).toContain('aria-controls="probabilityAside"')
  expect(html).toContain("classList.toggle('mobile-open')")
  expect(html).toContain('const stats=p.batchStats||{}')
})


test('gacha editor distinguishes alternating reward and trade rows and clears save feedback', async () => {
  const html = await read('public/gacha-lab/index.html')
  expect(html).toContain('#rewardRows .reward-entry:nth-child(even)')
  expect(html).toContain('#tradeRows .trade-row:nth-child(even)')
  expect(html).toContain('if(feedbackTimer)clearTimeout(feedbackTimer)')
  expect(html).toContain("f.classList.add('hidden');f.textContent=''")
})

test('mobile editor alternates visibly light and purple cards and draw controls remain compact', async () => {
  const html = await read('public/gacha-lab/index.html')
  expect(html).toContain('background:#f5f1ff')
  expect(html).toContain('background:#35254f')
  expect(html).toContain('#tradeRows .trade-row:nth-child(odd) input')
  expect(html).toContain('.secondary-actions #resetPool{grid-column:3;grid-row:2')
  expect(html).toContain('.top .tabs button{padding:7px 12px')
})
