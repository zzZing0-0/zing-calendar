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
