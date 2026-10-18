import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { readStylesheet } from '../helpers/applicationSource'
const css = readStylesheet('src/features/habits/habits.css')
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

test('native date focus hides underlying management footer and moving focus away restores it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.setContent(`<meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style><button type="button" aria-label="结束日期输入">完成</button><section class="habit-modal"><div class="habit-log-editor"><label>发生日期<span class="habit-date-control"><span class="habit-date-display">2026年10月17日</span><input type="date" value="2026-10-17" aria-label="发生日期"></span></label></div><footer><Button>编辑习惯</Button><Button>归档</Button><Button>删除</Button></footer></section>`)
  const footer=page.locator('.habit-modal footer')
  await expect(footer).toBeVisible()
  await page.locator('input[type="date"]').focus()
  await expect(footer).toBeHidden()
  // Chromium's segmented native date control can retain focus after a synthetic blur().
  // Move focus as a user does, then verify both the focus transition and the footer.
  await page.getByRole('button', { name: '结束日期输入' }).focus()
  await expect(page.locator('input[type="date"]')).not.toBeFocused()
  await expect(footer).toBeVisible()
})

test('habit editor retains quantity, units and scheduling behavior', () => {
  expect(component).toContain('className="habit-target-fields"')
  expect(component).toContain('value={draft.quantityTarget}')
  expect(component).toContain('value={draft.times}')
  expect(component).toContain('value={draft.unit}')
  expect(component).toContain('e.currentTarget.blur()')
})
