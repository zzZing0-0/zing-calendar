import { expect, test } from '@playwright/test'
import { readStylesheet } from '../helpers/applicationSource'

const css = readStylesheet('src/features/habits/habits.css')

test('iPhone-sized date picker stays inside dialog and native input can be changed', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.setContent(`<meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style>
    <div class="habit-modal-backdrop"><section class="habit-modal" role="dialog">
      <header><h3>找工作准备</h3></header><div class="habit-log-editor">
        <label>发生日期<span class="habit-date-control"><span class="habit-date-display">17 Oct 2026</span>
          <input type="date" aria-label="发生日期" value="2026-10-17" max="2026-10-17"></span></label>
        <label>数量（次）<input type="number" value="1"></label>
        <Button type="button">添加记录</Button>
      </div></section></div>`)
  const modal = await page.locator('.habit-modal').boundingBox()
  const field = await page.locator('.habit-date-control').boundingBox()
  const input = await page.locator('input[type="date"]').boundingBox()
  expect(modal).not.toBeNull(); expect(field).not.toBeNull(); expect(input).not.toBeNull()
  expect(field!.x).toBeGreaterThanOrEqual(modal!.x)
  expect(field!.x + field!.width).toBeLessThanOrEqual(modal!.x + modal!.width + 1)
  expect(input!.x + input!.width).toBeLessThanOrEqual(field!.x + field!.width + 1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.locator('input[type="date"]').fill('2026-10-16')
  await expect(page.locator('input[type="date"]')).toHaveValue('2026-10-16')
})

test('submit label remains white and visible against the green button', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.setContent(`<meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style>
    <section class="habit-modal"><div class="habit-log-editor"><Button>添加记录</Button></div></section>`)
  const button = page.getByRole('button', { name: '添加记录' })
  await expect(button).toBeVisible()
  const computed = await button.evaluate(el => {
    const s = getComputedStyle(el)
    return { color: s.color, webkit: s.webkitTextFillColor, bg: s.backgroundColor, opacity: s.opacity }
  })
  expect(computed.color).toBe('rgb(255, 255, 255)')
  expect(computed.webkit).toBe('rgb(255, 255, 255)')
  expect(computed.bg).toBe('rgb(57, 118, 93)')
  expect(computed.opacity).toBe('1')
})
