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

test('custom draw batches are counted by batch size, persisted and reset independently', async ({ page }) => {
  await page.goto('/gacha-lab/index.html')
  await page.locator('#customN').fill('40')
  await page.locator('#customDraw').click()
  await page.locator('#showProbability').click()
  await expect(page.locator('#probabilityContent')).toContainText('40抽 (1轮)')
  await expect(page.locator('#probabilityContent')).toContainText('23.27%')
  await expect(page.locator('#probabilityContent')).toContainText('累计模拟 40 抽')
  await expect(page.locator('#probabilityContent')).toContainText('¥240')
  await page.reload()
  await page.locator('#showProbability').click()
  await expect(page.locator('#probabilityContent')).toContainText('40抽 (1轮)')
  await expect(page.locator('#probabilityContent')).toContainText('40 抽')
  page.once('dialog', dialog => dialog.accept())
  await page.locator('#resetPool').click()
  await expect(page.locator('#probabilityContent')).not.toContainText('40抽')
  await expect(page.locator('#probabilityContent')).toContainText('累计模拟 0 抽')
})

test('custom 10 draws aggregate with standard ten-draw rounds', async ({ page }) => {
  await page.goto('/gacha-lab/index.html')
  await page.locator('#customN').fill('10')
  await page.locator('#customDraw').click()
  await page.locator('[data-draw="10"]').click()
  await page.locator('#showProbability').click()
  const ten = page.locator('.prob-comparison').filter({ hasText: '10抽' })
  await expect(ten).toContainText('(2轮)')
  await expect(page.locator('#probabilityContent')).toContainText('累计模拟 20 抽')
})

test('host navigation stays outside the iframe, above its content, with loading recovery', async () => {
  const [page, css] = await Promise.all([
    read('src/features/gacha-lab/GachaLabPage.tsx'), read('src/App.css'),
  ])
  expect(page).toContain('createPortal(')
  expect(page).toContain('document.body')
  expect(page).toContain('onClick={onClose}')
  expect(page).toContain('onError={() => setLoadState')
  expect(page).toContain('重试加载')
  expect(page).toContain('返回日历')
  expect(css).toContain('.gacha-lab-toolbar{position:relative;z-index:2')
  expect(css).toContain('.gacha-lab-overlay{z-index:2147483000')
})

test('custom batch rows are sorted and merge by batch size', async ({ page }) => {
  await page.goto('/gacha-lab/index.html')
  await page.locator('#customN').fill('40')
  await page.locator('#customDraw').click()
  await page.locator('#customN').fill('20')
  await page.locator('#customDraw').click()
  await page.locator('#customN').fill('40')
  await page.locator('#customDraw').click()
  await page.locator('#showProbability').click()
  const rows = page.locator('#probabilityContent .prob-comparison .prob-values span:first-child')
  await expect(rows).toHaveText(['1抽 (0轮)', '10抽 (0轮)', '20抽 (1轮)', '40抽 (2轮)', '100抽 (0轮)'])
  await page.reload()
  await expect(rows).toHaveText(['1抽 (0轮)', '10抽 (0轮)', '20抽 (1轮)', '40抽 (2轮)', '100抽 (0轮)'])
})
