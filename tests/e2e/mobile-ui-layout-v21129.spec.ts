import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.tsx', 'utf8')
const habits = readFileSync('src/features/habits/HabitsPage.tsx', 'utf8')
const css = readFileSync('src/App.css', 'utf8')
const habitsCss = readFileSync('src/features/habits/habits.css', 'utf8')

test('settings destination shortcuts keep SVG and label on the same compact row', async ({ page }) => {
  expect(app).toContain('settings-link-row settings-destination-link')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.setContent(`<style>${css}</style><section class="settings-page"><button class="settings-link-row settings-destination-link"><span class="settings-nav-link-label"><svg class="bottom-nav-icon" viewBox="0 0 24 24"></svg><strong>纪念日</strong></span><b>›</b></button></section>`)
  const positions = await page.evaluate(() => {
    const row = document.querySelector('.settings-destination-link')!.getBoundingClientRect()
    const icon = document.querySelector('.bottom-nav-icon')!.getBoundingClientRect()
    const label = document.querySelector('.settings-nav-link-label strong')!.getBoundingClientRect()
    return { rowHeight: row.height, iconY: icon.y + icon.height / 2, labelY: label.y + label.height / 2, iconRight: icon.right, labelLeft: label.left }
  })
  expect(positions.rowHeight).toBeLessThanOrEqual(65)
  expect(Math.abs(positions.iconY - positions.labelY)).toBeLessThan(5)
  expect(positions.iconRight).toBeLessThan(positions.labelLeft)
})

test('habit tag is inside the progress line, not a separate block', async ({ page }) => {
  expect(habits).toMatch(/className="habit-card-tag"[\s\S]*?<\/span><\/>}<\/small><\/button>/)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.setContent(`<style>${habitsCss}</style><main class="habits-page"><article class="habit-card"><button class="habit-card-main"><strong>听力练习</strong><small>每日 0/1 次 · 每次 30 分钟 · <span class="habit-card-tag"><i></i>听力</span></small></button><div class="habit-card-actions"><button>打卡</button></div></article></main>`)
  const positions = await page.evaluate(() => {
    const summary = document.querySelector('.habit-card-main small')!.getBoundingClientRect()
    const tag = document.querySelector('.habit-card-tag')!.getBoundingClientRect()
    return { summaryHeight: summary.height, tagY: tag.y + tag.height / 2, summaryY: summary.y + summary.height / 2 }
  })
  expect(Math.abs(positions.tagY - positions.summaryY)).toBeLessThan(6)
  expect(positions.summaryHeight).toBeLessThan(32)
})

test('notes and habits share the same action button height', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.setContent(`<style>${css}\n${habitsCss}</style><main class="notes-page"><header class="page-heading notes-heading"><div><span class="eyebrow">NOTES</span><h2>笔记</h2></div><div class="notes-actions"><button>笔记本</button><button>新建</button></div></header></main><main class="habits-page"><header class="habits-header"><div><span class="eyebrow">HABITS</span><h2>习惯</h2></div><button class="primary-button">新建习惯</button></header></main>`)
  const heights = await page.evaluate(() => [document.querySelector('.notes-actions button')!, document.querySelector('.habits-header .primary-button')!].map(element => element.getBoundingClientRect().height))
  expect(heights[0]).toBe(44)
  expect(heights[1]).toBe(44)
})
