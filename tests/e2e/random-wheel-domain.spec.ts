import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = (path: string) => readFile(resolve(root, path), 'utf8')

test.describe('random wheel regression', () => {
  test('wheel and pool overlays are actually mounted from Settings state', async () => {
    const source = await read('src/App.tsx')
    expect(source).toContain('<RandomWheelPage groups={randomPoolGroups} items={randomPoolItems}')
    expect(source).toContain('<RandomPoolManager groups={randomPoolGroups} items={randomPoolItems}')
    expect(source).toContain('!randomWheelOpen && !randomPoolOpen')
  })

  test('pool naming is consistently 幸运池', async () => {
    const app = await read('src/App.tsx')
    const wheel = await read('src/features/random-wheel/RandomWheelPage.tsx')
    const pool = await read('src/features/random-wheel/RandomPoolManager.tsx')
    expect(app).toContain('<strong>幸运池</strong>')
    expect(wheel).toContain('还没有幸运池。先去「幸运池」添加分组和项目吧。')
    expect(pool).toContain('<h2>幸运池</h2>')
    expect(`${app}\n${wheel}\n${pool}`).not.toContain('奇遇池')
  })

  test('crypto random helper uses an ArrayBuffer-backed Uint32Array and animation does not choose winner', async () => {
    const domain = await read('src/domain/randomWheel.ts')
    const wheel = await read('src/features/random-wheel/RandomWheelPage.tsx')
    expect(domain).toContain('Uint32Array<ArrayBuffer>')
    expect(domain).toContain('new ArrayBuffer(Uint32Array.BYTES_PER_ELEMENT)')
    expect(wheel).toContain('const unit=cryptoUnit(),chosen=chooseWeightedItem(items,groupId,unit)')
    expect(wheel).toContain('window.setTimeout(()=>{setSpinning(false);setWinner(chosen)},3900)')
  })
})

test.describe('random wheel v2.8.6 presentation regression', () => {
  test('settings and wheel title stay emoji-free while prize content may remain playful', async () => {
    const app = await read('src/App.tsx')
    const wheel = await read('src/features/random-wheel/RandomWheelPage.tsx')
    expect(app).toContain('<strong>抽奖大转盘</strong>')
    expect(app).not.toContain('<strong>🎡 抽奖大转盘</strong>')
    expect(wheel).toContain('<h2>幸运大转盘</h2>')
    expect(wheel).not.toContain('<h2>🎡 幸运大转盘</h2>')
  })

  test('marquee lamps glow without scale-based popping', async () => {
    const css = await read('src/App.css')
    const block = css.slice(css.indexOf('/* v2.8.6 — lucky wheel marquee'))
    expect(block).toContain('@keyframes ferrisLampGlow')
    expect(block).toContain('filter:brightness(1.42)')
    expect(block).not.toContain('scale:1.28')
    expect(block).not.toContain('scale(1.28)')
  })

  test('pool groups are collapsible and item editor uses two-row mobile layout with custom checkbox', async () => {
    const pool = await read('src/features/random-wheel/RandomPoolManager.tsx')
    const css = await read('src/App.css')
    expect(pool).toContain('aria-expanded={!isCollapsed}')
    expect(pool).toContain('random-pool-item-main')
    expect(pool).toContain('random-pool-item-details')
    expect(pool).toContain('random-checkbox')
    expect(css).toContain('.random-enabled input:checked+.random-checkbox')
    expect(css).toContain('.random-pool-item-details{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))')
  })
})
