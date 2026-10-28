import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

const fixture = JSON.parse(readFileSync('tests/fixtures/gacha/v2.15.22-state.json', 'utf8'))

test('mobile shop multi-target selector stays inside its row and screen', async ({ page }) => {
  const data = structuredClone(fixture)
  const pool = data.pools[0]
  data.active = pool.id
  const trade = pool.config.trades[0]
  trade.rewardIds = pool.config.rewards.filter((r: { id: string }) => r.id !== trade.from).slice(0, 3).map((r: { id: string }) => r.id)
  await page.goto('/')
  await page.evaluate(data => localStorage.setItem('zing-gacha-v1', JSON.stringify(data)), data)
  await page.locator('.bottom-nav').getByRole('button', { name: '设置', exact: true }).click()
  await page.locator('.settings-link-row').filter({ hasText: '抽奖模拟器' }).click()
  const picker = page.locator('.shop-picker').first()
  await picker.locator('summary').click()
  const menu = picker.locator('.shop-picker-menu')
  await expect(menu).toBeVisible()
  const bounds = await menu.evaluate(el => {
    const menu = el.getBoundingClientRect()
    const row = el.closest('.shop-row')!.getBoundingClientRect()
    return { menuLeft: menu.left, menuRight: menu.right, rowLeft: row.left, rowRight: row.right, viewport: innerWidth }
  })
  expect(bounds.menuLeft).toBeGreaterThanOrEqual(bounds.rowLeft - 1)
  expect(bounds.menuRight).toBeLessThanOrEqual(bounds.rowRight + 1)
  expect(bounds.menuRight).toBeLessThanOrEqual(bounds.viewport + 1)
})

test('habit focus history renders at most 20 rows per page and keeps calendar in detail view', async ({ page }) => {
  await page.goto('/')
  await page.locator('.bottom-nav').getByRole('button', { name: '习惯' }).click()
  await page.getByRole('button', { name: /新建习惯/ }).click()
  await page.getByRole('dialog', { name: '编辑习惯' }).getByLabel('名称').fill('历史分页测试')
  await page.getByRole('dialog', { name: '编辑习惯' }).getByRole('button', { name: '保存' }).click()
  // The first matching button is the drag handle, not the habit detail trigger.
  await page.locator('.habit-card-main').filter({ hasText: '历史分页测试' }).click()
  await expect(page.getByRole('dialog', { name: '历史分页测试详情' })).toBeVisible()
  await expect(page.getByRole('dialog', { name: '历史分页测试详情' }).locator('.habit-focus-panel')).toBeVisible()
  await expect(page.getByRole('dialog', { name: '历史分页测试详情' }).locator('.habit-calendar')).toBeVisible()
  await page.getByRole('dialog', { name: '历史分页测试详情' }).locator('.ui-focus-card-history').click()
  await expect(page.getByRole('region', { name: '习惯专注历史' })).toBeVisible()
  await expect(page.getByRole('region', { name: '习惯专注历史' }).getByText('还没有专注记录')).toBeVisible()
  await page.getByRole('button', { name: '‹ 返回完成日历' }).click()
  await expect(page.getByRole('dialog', { name: '历史分页测试详情' }).locator('.habit-focus-panel')).toBeVisible()
})


test('1000 focus sessions are paginated without rendering a thousand rows', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { paginateHabitFocusHistory } = await import('/src/features/habits/HabitFocusHistory.tsx')
    const sessions = Array.from({ length: 1000 }, (_, i) => ({ startedAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(), id: i }))
    return {
      first: paginateHabitFocusHistory(sessions, 0),
      last: paginateHabitFocusHistory(sessions, 49),
      overflow: paginateHabitFocusHistory(sessions, 1000),
    }
  })
  expect(result.first.totalPages).toBe(50)
  expect(result.first.visible).toHaveLength(20)
  expect(result.last.visible).toHaveLength(20)
  expect(result.last.page).toBe(49)
  expect(result.overflow.page).toBe(49)
  expect(result.first.visible[0].id).toBe(999)
  expect(result.last.visible.at(-1)?.id).toBe(0)
})
