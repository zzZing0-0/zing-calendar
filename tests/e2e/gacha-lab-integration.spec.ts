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
