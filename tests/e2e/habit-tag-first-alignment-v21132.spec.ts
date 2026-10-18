import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const css = readFileSync('src/features/habits/habits.css', 'utf8')
const source = readFileSync('src/features/habits/HabitsPage.tsx', 'utf8')

test('tag precedes progress in the habit card markup', () => {
  const card = source.slice(source.indexOf('className="habit-card-metadata"'))
  expect(card.indexOf('className="habit-card-tag"')).toBeGreaterThan(0)
  expect(card.indexOf('className="habit-card-tag"')).toBeLessThan(card.indexOf('className="habit-card-progress"'))
  expect(card.slice(0, card.indexOf('</small>'))).not.toContain(' · <span className="habit-card-tag"')
})

for (const width of [390, 320, 768]) {
  test(`tag, dot and progress share vertical center at ${width}px`, async ({page}) => {
    await page.setViewportSize({width,height:844})
    await page.setContent(`<meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><main class="habits-page"><article class="habit-card"><button class="habit-card-main"><strong>听力练习</strong><small class="habit-card-metadata"><span class="habit-card-tag"><i style="background:#a2ca58"></i>听力</span><span class="habit-card-progress">每日 0/1 次 · 每次 30 分钟</span></small></button><div class="habit-card-actions"><button>＋ 打卡</button></div></article></main>`)
    const m = await page.evaluate(() => {
      const rect = (s:string) => document.querySelector(s)!.getBoundingClientRect()
      const mid = (r:DOMRect) => (r.top+r.bottom)/2
      const tag=rect('.habit-card-tag'), dot=rect('.habit-card-tag i'), progress=rect('.habit-card-progress')
      return {order:tag.right<=progress.left,dy:Math.abs(mid(tag)-mid(progress)),dotDy:Math.abs(mid(dot)-mid(tag)),sameRow:Math.abs(mid(tag)-mid(progress))<2}
    })
    expect(m.order).toBe(true)
    expect(m.dy).toBeLessThan(2)
    expect(m.dotDy).toBeLessThan(2)
    expect(m.sameRow).toBe(true)
  })
}
