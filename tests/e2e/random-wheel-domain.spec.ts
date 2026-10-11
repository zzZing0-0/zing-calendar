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
    expect(wheel).toContain('const unit=cryptoUnit(),chosen=chooseWeightedFromItems(current,unit)')
    expect(wheel).toContain('window.setTimeout(()=>{setSpinning(false);playLanding();setWinner(chosen)},3900)')
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

test.describe('random wheel v2.8.7 regression', () => {
  test('marquee lamps use per-lamp staggered delays instead of flashing in sync', async () => {
    const wheel = await read('src/features/random-wheel/RandomWheelPage.tsx')
    const css = await read('src/App.css')
    expect(wheel).toContain("'--lamp-delay':`${i*90}ms`")
    expect(css).toContain('animation-delay:var(--lamp-delay)!important')
    expect(css).toContain('6%,9%{opacity:1')
  })

  test('spin keeps audible landing feedback connected to the user-triggered flow', async () => {
    const wheel = await read('src/features/random-wheel/RandomWheelPage.tsx')
    expect(wheel).toContain('const playSpinSound=()=>')
    expect(wheel).toContain('ensureAudio();playSpinSound();setWinner(null)')
    expect(wheel).toContain('const playLanding=()=>')
    expect(wheel).toContain('setSpinning(false);playLanding();setWinner(chosen)')
  })

  test('group picker sits beside the wheel title and mobile spin button has breathing room', async () => {
    const wheel = await read('src/features/random-wheel/RandomWheelPage.tsx')
    const css = await read('src/App.css')
    expect(wheel).toContain('random-wheel-title-row')
    expect(wheel).toContain('className="random-wheel-group-select"')
    expect(wheel).not.toContain('className="random-wheel-group-tabs"')
    expect(css).toContain('.random-spin-button{margin-top:44px}')
  })
})


test.describe('random wheel v2.8.8 regression', () => {
  test('lucky pool item details stay in one compact second row on mobile', async () => {
    const pool = await read('src/features/random-wheel/RandomPoolManager.tsx')
    const css = await read('src/App.css')
    expect(pool).toContain('<div className="random-pool-item-details">')
    expect(pool).toContain('<span>数量</span>')
    expect(pool).toContain('<span>单位</span>')
    expect(pool).toContain('<span>权重</span>')
    expect(css).toContain('/* v2.8.8 — force compact two-row lucky-pool items */')
    expect(css).toContain('.random-pool-item-details{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important')
    expect(css).toContain('.random-pool-item-details label{display:flex!important;flex-direction:column!important')
  })
})


test.describe('random wheel v2.8.9 regression', () => {
  test('marquee alternates one chase lap with two synchronized flashes', async () => {
    const wheel = await read('src/features/random-wheel/RandomWheelPage.tsx')
    const css = await read('src/App.css')
    expect(wheel).toContain('[lampFlash,setLampFlash]=useState(false)')
    expect(wheel).toContain('setLampFlash(true)')
    expect(wheel).toContain('setLampFlash(false);schedule()')
    expect(wheel).toContain('},720)},1440)')
    expect(wheel).toContain("lampFlash?' ferris-rim-flash':''")
    expect(css).toContain('animation:ferrisAllFlash .72s linear 1!important')
    expect(css).toContain('@keyframes ferrisAllFlash')
  })

  test('mobile wheel and spin button use the lower half of the page more comfortably', async () => {
    const css = await read('src/App.css')
    const block = css.slice(css.indexOf('/* v2.8.9 — marquee rhythm'))
    expect(block).toContain('.ferris-wrap{margin-top:14px}')
    expect(block).toContain('.random-spin-button{margin-top:44px}')
  })
})

test.describe('random wheel v2.8.10 mixed pool regression', () => {
  test('mixed pool selects across groups and inherits original item weights', async () => {
    const domain = await read('src/domain/randomWheel.ts')
    const wheel = await read('src/features/random-wheel/RandomWheelPage.tsx')
    expect(domain).toContain('validMixedRandomItems')
    expect(domain).toContain('selected.has(item.id)')
    expect(domain).toContain('chooseWeightedFromItems')
    expect(wheel).toContain("const MIXED_POOL_ID='__mixed__'")
    expect(wheel).toContain('chooseWeightedFromItems(current,unit)')
    expect(wheel).toContain('mixed.length>=2&&<option value={MIXED_POOL_ID}>混合池</option>')
  })

  test('mixed selection is independent of ordinary enabled state and cleans deleted references', async () => {
    const domain = await read('src/domain/randomWheel.ts')
    const pool = await read('src/features/random-wheel/RandomPoolManager.tsx')
    const app = await read('src/App.tsx')
    const mixedBlock = domain.slice(domain.indexOf('export function validMixedRandomItems'), domain.indexOf('export function chooseWeightedFromItems'))
    expect(mixedBlock).not.toContain('item.enabled')
    expect(pool).toContain('onMixedPoolItemIds(mixedPoolItemIds.filter(id => id !== item.id))')
    expect(pool).toContain('onMixedPoolItemIds(mixedPoolItemIds.filter(id => !groupItems.some(item => item.id === id)))')
    expect(app).toContain("localStorage.setItem('zing:mixedPoolItemIds'")
  })

  test('mixed pool participates in settings sync backup and restore', async () => {
    const settings = await read('src/domain/settings.ts')
    const types = await read('src/types.ts')
    const app = await read('src/App.tsx')
    expect(settings).toContain('mixedPoolItemIds: input.mixedPoolItemIds ?? []')
    expect(settings).toContain('mixedPoolItemIds: settings.mixedPoolItemIds ?? []')
    expect(types).toContain('mixedPoolItemIds?: string[]')
    expect(app).toContain('mixedPoolItemIds:Array.isArray(s.mixedPoolItemIds)?s.mixedPoolItemIds:mixedPoolItemIds')
    expect(app).toContain('setMixedPoolItemIds(incoming.mixedPoolItemIds)')
  })
})


test.describe('random wheel v2.8.11 pool default-collapse regression', () => {
  test('existing lucky-pool groups start collapsed when opening the manager', async () => {
    const pool = await read('src/features/random-wheel/RandomPoolManager.tsx')
    expect(pool).toContain("useState<Record<string, boolean>>(() => Object.fromEntries(groups.map(group => [group.id, true])))")
    expect(pool).toContain("const isCollapsed = Boolean(collapsed[group.id])")
    expect(pool).toContain("aria-expanded={!isCollapsed}")
  })

  test('a newly created group opens immediately so it can be edited', async () => {
    const pool = await read('src/features/random-wheel/RandomPoolManager.tsx')
    expect(pool).toContain('const id = crypto.randomUUID()')
    expect(pool).toContain("setCollapsed(current => ({ ...current, [id]: false }))")
  })
})


test.describe('random wheel v2.8.12 UI consistency regression', () => {
  test('mixed pool is hidden from wheel picker until it has two valid items', async () => {
    const wheel = await read('src/features/random-wheel/RandomWheelPage.tsx')
    expect(wheel).toContain("groupId===MIXED_POOL_ID&&mixed.length<2")
    expect(wheel).toContain("mixed.length>=2&&<option value={MIXED_POOL_ID}>混合池</option>")
  })

  test('mixed pool manager starts collapsed and can be expanded explicitly', async () => {
    const pool = await read('src/features/random-wheel/RandomPoolManager.tsx')
    expect(pool).toContain('const [mixedCollapsed, setMixedCollapsed] = useState(true)')
    expect(pool).toContain('aria-expanded={!mixedCollapsed}')
    expect(pool).toContain("mixedCollapsed?' is-collapsed':''")
    expect(pool).toContain('!mixedCollapsed&&')
  })

  test('focus limit keeps title unit and numeric input on one line', async () => {
    const app = await read('src/App.tsx')
    const css = await read('src/App.css')
    expect(app).toContain('最长专注时长（小时）')
    expect(app).toContain('className="max-focus-setting-line"')
    expect(app).not.toContain('<b>小时</b>')
    expect(css).toContain('.max-focus-setting-line{display:flex;align-items:center;justify-content:space-between')
  })

  test('mobile wheel reserves a standalone navigation row above its content', async () => {
    const wheel = await read('src/features/random-wheel/RandomWheelPage.tsx')
    const css = await read('src/App.css')
    expect(wheel).toContain('random-wheel-top random-wheel-page-top')
    expect(css).toContain('.random-wheel-page .random-wheel-page-top>button{grid-row:1')
    expect(css).toContain('.random-wheel-page .random-wheel-page-top>div{grid-row:2')
  })

  test('settings card separators follow one internal-row rule', async () => {
    const css = await read('src/App.css')
    expect(css).toContain('.settings-group-title + .setting-row')
    expect(css).toContain('.settings-group-title + .settings-link-row')
    expect(css).toContain('.encouragement-style-setting{border-bottom:0}')
    expect(css).toContain('.encouragement-style-setting + .setting-row')
  })
})


test.describe('random wheel v2.8.13 usability regression', () => {
  test('weight input replaces the visible zero instead of producing a leading-zero edit', async () => {
    const pool = await read('src/features/random-wheel/RandomPoolManager.tsx')
    expect(pool).toContain('onFocus={event => event.currentTarget.select()}')
    expect(pool).toContain("event.target.value === '' ? 0 : Number(event.target.value)")
  })

  test('mixed pool group heading can select all clear all and represent partial selection', async () => {
    const pool = await read('src/features/random-wheel/RandomPoolManager.tsx')
    expect(pool).toContain('const toggleMixedGroup = (groupItems: RandomPoolItem[], checked: boolean)')
    expect(pool).toContain("aria-checked={partiallySelected?'mixed':allSelected}")
    expect(pool).toContain("partiallySelected?'−':'✓'")
    expect(pool).toContain('toggleMixedGroup(groupItems,event.target.checked)')
  })

  test('wheel labels use the outer sector and omit redundant metadata', async () => {
    const wheel = await read('src/features/random-wheel/RandomWheelPage.tsx')
    expect(wheel).toContain('const labelRadius=r*.72')
    expect(wheel).toContain('wheelLabelLines(ctx,item.name,maxWidth,maxLines)')
    expect(wheel).toContain("visible[maxLines - 1] = `${last}…`")
    expect(wheel).toContain('ctx.clip()')
    expect(wheel).not.toContain("Math.round(item.weight/total*100)")
    expect(wheel).not.toContain("item.amount!=null?")
  })
})


test.describe('random wheel v2.8.15 adaptive label regression', () => {
  test('labels keep a full name on one line whenever it already fits', async () => {
    const wheel = await read('src/features/random-wheel/RandomWheelPage.tsx')
    expect(wheel).toContain('if (ctx.measureText(clean).width <= maxWidth) return [clean]')
  })

  test('English words stay intact and line count follows available sector depth', async () => {
    const wheel = await read('src/features/random-wheel/RandomWheelPage.tsx')
    expect(wheel).toContain("match(/[A-Za-z0-9]+(?:['’_-][A-Za-z0-9]+)*|[^\\s]/gu)")
    expect(wheel).toContain('maxLines=Math.max(1,Math.floor((r*.58)/lineHeight))')
    expect(wheel).toContain('wheelLabelLines(ctx,item.name,maxWidth,maxLines)')
  })
})
