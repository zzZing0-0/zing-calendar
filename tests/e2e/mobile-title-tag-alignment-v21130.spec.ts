import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const appCss = readFileSync('src/App.css', 'utf8')
const habitCss = readFileSync('src/features/habits/habits.css', 'utf8')
const habitSource = readFileSync('src/features/habits/HabitsPage.tsx', 'utf8')

test('notes and habits actions align to Chinese heading, not eyebrow or full header', async ({page}) => {
  await page.setViewportSize({width:390,height:844})
  await page.setContent(`<meta name="viewport" content="width=device-width, initial-scale=1"><style>${appCss}\n${habitCss}</style><main class="notes-page"><header class="page-heading notes-heading"><div><span class="eyebrow">NOTES</span><h2>笔记</h2></div><div class="notes-actions"><button>笔记本</button><button>＋ 新建</button></div></header></main><main class="habits-page"><header class="habits-header"><div><span class="eyebrow">HABITS</span><h2>习惯</h2></div><button class="primary-button">＋ 新建习惯</button></header></main>`)
  // Mobile Chromium emulates a 980px layout viewport without a viewport meta tag.
  // Include the app's viewport metadata so responsive CSS is actually exercised.
  expect(await page.evaluate(() => window.innerWidth)).toBe(390)
  const positions = await page.evaluate(() => {
    const center = (selector:string) => {const r=document.querySelector(selector)!.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,height:r.height}}
    return {noteTitle:center('.notes-heading h2'),noteButton:center('.notes-actions button'),habitTitle:center('.habits-header h2'),habitButton:center('.habits-header .primary-button')}
  })
  expect(Math.abs(positions.noteTitle.y-positions.noteButton.y)).toBeLessThan(3)
  expect(Math.abs(positions.habitTitle.y-positions.habitButton.y)).toBeLessThan(3)
  expect(positions.noteButton.height).toBe(44)
  expect(positions.habitButton.height).toBe(44)
})

test('habit metadata tag has no separator dot and stays inline with progress', async ({page}) => {
  expect(habitSource).not.toContain('&&<> · <span className="habit-card-tag">')
  expect(habitSource).toContain('&&<><span className="habit-card-tag">')
  await page.setViewportSize({width:390,height:844})
  await page.setContent(`<meta name="viewport" content="width=device-width, initial-scale=1"><style>${habitCss}</style><main class="habits-page"><article class="habit-card"><button class="habit-card-main"><strong>听力练习</strong><small><span id="progress">每日 0/1 次 · 每次 30 分钟</span><span class="habit-card-tag"><i style="background:#a2ca58"></i>听力</span></small></button><div class="habit-card-actions"><button>＋ 打卡</button></div></article></main>`)
  expect(await page.evaluate(() => window.innerWidth)).toBe(390)
  const p = await page.evaluate(() => {
    const a=document.querySelector('#progress')!.getBoundingClientRect(), b=document.querySelector('.habit-card-tag')!.getBoundingClientRect(), dot=document.querySelector('.habit-card-tag i')!.getBoundingClientRect()
    return {gap:b.left-a.right,deltaY:Math.abs((a.top+a.bottom)/2-(b.top+b.bottom)/2),dotDelta:Math.abs((dot.top+dot.bottom)/2-(b.top+b.bottom)/2)}
  })
  expect(p.gap).toBeGreaterThanOrEqual(8)
  expect(p.gap).toBeLessThanOrEqual(15)
  expect(p.deltaY).toBeLessThan(4)
  expect(p.dotDelta).toBeLessThan(3)
})
