import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
const css = readFileSync('src/features/habits/habits.css', 'utf8')
const component = readFileSync('src/features/habits/HabitsPage.tsx', 'utf8')

test('mobile target inputs fit in one compact row without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.setContent(`<meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style><section class="habit-modal"><div class="habit-form"><div class="habit-target-fields"><label>每天次数<input type="number" value="1"></label><label>每次数量<input type="number" value="1"></label><label>单位<input value="次"></label></div></div></section>`)
  const labels = page.locator('.habit-target-fields label')
  const boxes = await labels.evaluateAll(nodes => nodes.map(node => {const r=node.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top}}))
  expect(boxes).toHaveLength(3)
  expect(boxes[0].top).toBe(boxes[1].top)
  expect(boxes[1].top).toBe(boxes[2].top)
  const modal = await page.locator('.habit-modal').boundingBox()
  expect(boxes[2].right).toBeLessThanOrEqual(modal!.x+modal!.width+1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
})

test('native date focus hides underlying management footer and blur restores it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.setContent(`<meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style><section class="habit-modal"><div class="habit-log-editor"><label>发生日期<span class="habit-date-control"><span class="habit-date-display">2026年10月17日</span><input type="date" value="2026-10-17" aria-label="发生日期"></span></label></div><footer><button>编辑习惯</button><button>归档</button><button>删除</button></footer></section>`)
  const footer=page.locator('.habit-modal footer')
  await expect(footer).toBeVisible()
  await page.locator('input[type="date"]').focus()
  await expect(footer).toBeHidden()
  await page.locator('input[type="date"]').blur()
  await expect(footer).toBeVisible()
})

test('habit editor retains quantity, units and scheduling behavior', () => {
  expect(component).toContain('className="habit-target-fields"')
  expect(component).toContain('value={draft.quantityTarget}')
  expect(component).toContain('value={draft.times}')
  expect(component).toContain('value={draft.unit}')
  expect(component).toContain('e.currentTarget.blur()')
})
