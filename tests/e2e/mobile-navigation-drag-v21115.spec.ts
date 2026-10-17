import { expect, test } from '@playwright/test'
import { BUILTIN_MOBILE_NAV, missingMobileNav, moveMobileNav, normalizeMobileNav } from '../../src/features/navigation/navigationConfig'

const names = (ids: string[]) => ids.join(',')

test('moving across areas respects four/five items and keeps fixed endpoints', () => {
  const start = BUILTIN_MOBILE_NAV
  const removed = moveMobileNav(start, 'habits', 'hidden', 0)
  // Bottom navigation must contain at least four destinations.
  expect(removed.middleItems).toEqual(['notes', 'habits'])
  const added = moveMobileNav(start, 'statistics', 'shown', 1)
  expect(added.middleItems).toEqual(['notes', 'statistics', 'habits'])
  expect(added.itemCount).toBe(5)
  expect(moveMobileNav(added, 'anniversaries', 'shown', 0).middleItems).toEqual(added.middleItems)
  const hidden = moveMobileNav(added, 'habits', 'hidden', 0)
  expect(hidden.middleItems).toEqual(['notes', 'statistics'])
  expect(hidden.itemCount).toBe(4)
  expect(missingMobileNav(hidden)[0]).toBe('habits')
})

test('hidden ordering survives normalization and old layouts get a deterministic order', () => {
  const config = normalizeMobileNav({ itemCount: 4, middleItems: ['notes', 'habits'], hiddenItems: ['statistics', 'anniversaries'] })
  expect(names(missingMobileNav(config))).toBe('statistics,anniversaries')
  const reordered = moveMobileNav(config, 'anniversaries', 'hidden', 0)
  expect(names(missingMobileNav(reordered))).toBe('anniversaries,statistics')
  expect(missingMobileNav(normalizeMobileNav({ itemCount: 4, middleItems: ['notes', 'habits'] }))).toEqual(['anniversaries', 'statistics'])
})

test('mobile editor supports sorting and Settings shortcuts follow hidden order', async ({ page, isMobile }) => {
  if (!isMobile) return
  await page.goto('/')
  await page.getByRole('navigation', { name: '主要功能' }).getByRole('button', { name: '设置' }).click()
  await page.getByRole('button', { name: /导航栏设置/ }).click()
  const dialog = page.getByRole('dialog', { name: '导航栏设置' })
  await expect(dialog.getByText('底部显示')).toBeVisible()
  await expect(dialog.getByText('不显示', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('button', { name: '4项' })).toHaveCount(0)
  await dialog.getByRole('button', { name: '统计上移' }).click()
  await dialog.getByRole('button', { name: '关闭导航栏设置' }).click()
  const group = page.locator('.mobile-nav-settings-group')
  const shortcuts = await group.locator('button[aria-label]').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')))
  expect(shortcuts).toEqual(['统计', '纪念日'])
  await page.reload()
  const reloaded = page.locator('.mobile-nav-settings-group')
  await page.getByRole('navigation', { name: '主要功能' }).getByRole('button', { name: '设置' }).click()
  const afterReload = await reloaded.locator('button[aria-label]').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')))
  expect(afterReload).toEqual(['统计', '纪念日'])
})
