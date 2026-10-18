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

test('habit tag precedes progress in the same compact metadata row', async ({ page }) => {
  const card = habits.slice(habits.indexOf('className="habit-card-metadata"'))
  expect(card.indexOf('className="habit-card-tag"')).toBeGreaterThan(0)
  expect(card.indexOf('className="habit-card-tag"')).toBeLessThan(card.indexOf('className="habit-card-progress"'))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.setContent(`<meta name="viewport" content="width=device-width,initial-scale=1"><style>${habitsCss}</style><main class="habits-page"><article class="habit-card"><button class="habit-card-main"><strong>听力练习</strong><small class="habit-card-metadata"><span class="habit-card-tag"><i></i>听力</span><span class="habit-card-progress">每日 0/1 次 · 每次 30 分钟</span></small></button><div class="habit-card-actions"><button>打卡</button></div></article></main>`)
  const m = await page.evaluate(() => {
    const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect()
    const tag = rect('.habit-card-tag'), progress = rect('.habit-card-progress'), summary = rect('.habit-card-metadata')
    return { leftToRight: tag.right < progress.left, sameLine: Math.abs((tag.top + tag.bottom) / 2 - (progress.top + progress.bottom) / 2), compact: summary.height }
  })
  expect(m.leftToRight).toBe(true)
  expect(m.sameLine).toBeLessThan(2)
  expect(m.compact).toBeLessThan(24)
})

test('notes and habits share the same action button height', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.setContent(`<style>${css}\n${habitsCss}</style><main class="notes-page"><header class="page-heading notes-heading"><div><span class="eyebrow">NOTES</span><h2>笔记</h2></div><div class="notes-actions"><button>笔记本</button><button>新建</button></div></header></main><main class="habits-page"><header class="habits-header"><div><span class="eyebrow">HABITS</span><h2>习惯</h2></div><button class="primary-button">新建习惯</button></header></main>`)
  const heights = await page.evaluate(() => [document.querySelector('.notes-actions button')!, document.querySelector('.habits-header .primary-button')!].map(element => element.getBoundingClientRect().height))
  expect(heights[0]).toBe(44)
  expect(heights[1]).toBe(44)
})
