import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { readStylesheet } from '../helpers/applicationSource'

const appCss = readStylesheet('src/App.css')
const habitCss = readStylesheet('src/features/habits/habits.css')
const habitSource = readFileSync('src/features/habits/HabitsPage.tsx', 'utf8')

test('notes and habits actions align to Chinese heading, not eyebrow or full header', async ({page}) => {
  await page.setViewportSize({width:390,height:844})
  await page.setContent(`<meta name="viewport" content="width=device-width, initial-scale=1"><style>${appCss}\n${habitCss}</style><main class="notes-page"><header class="page-heading notes-heading"><div><span class="eyebrow">NOTES</span><h2>笔记</h2></div><div class="notes-actions"><Button>笔记本</Button><Button>＋ 新建</Button></div></header></main><main class="habits-page"><header class="habits-header"><div><span class="eyebrow">HABITS</span><h2>习惯</h2></div><Button class="primary-button">＋ 新建习惯</Button></header></main>`)
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

