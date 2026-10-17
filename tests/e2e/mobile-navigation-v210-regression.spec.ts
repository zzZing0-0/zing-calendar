import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import { BUILTIN_MOBILE_NAV, missingMobileNav, normalizeMobileNav, resizeMobileNav, selectMobileNav } from '../../src/features/navigation/navigationConfig'

const app = fs.readFileSync('src/App.tsx', 'utf8')
const storage = fs.readFileSync('src/features/navigation/navigationStorage.ts', 'utf8')

test('mobile navigation normalizes malformed values and preserves fixed ends', () => {
  expect(normalizeMobileNav({ itemCount: 4, middleItems: ['statistics', 'statistics', 'unknown'] })).toEqual({ itemCount: 4, middleItems: ['statistics', 'notes'] })
  expect(normalizeMobileNav({ itemCount: 5, middleItems: ['notes', 'anniversaries', 'statistics'] })).toEqual(BUILTIN_MOBILE_NAV)
  expect(missingMobileNav({ itemCount: 4, middleItems: ['notes', 'statistics'] })).toEqual(['anniversaries'])
})

test('mobile navigation swaps occupied entries and extends four to five', () => {
  const four = resizeMobileNav(BUILTIN_MOBILE_NAV, 4)
  expect(four.middleItems).toEqual(['notes', 'anniversaries'])
  expect(selectMobileNav(four, 0, 'anniversaries').middleItems).toEqual(['anniversaries', 'notes'])
  expect(resizeMobileNav(four, 5).middleItems).toEqual(['notes', 'anniversaries', 'statistics'])
})

test('navigation is modular, only default template syncs, and desktop keeps all existing entries', () => {
  expect(app).toContain('<MobileNavigation config={mobileNav}')
  expect(app).toContain('<DesktopNavigation active={mainView}')
  expect(app).toContain('<MobileNavigationSettings')
  expect(app).toContain('defaultMobileNavigation: syncedDefaultMobileNav')
  expect(app).not.toContain('defaultMobileNavigation: mobileNav,')
  expect(storage).toContain('if (localStorage.getItem(LOCAL_KEY) !== null) return null')
})

test('mobile navigation settings offer dynamic other entries and save default only on demand', async ({ page, isMobile }) => {
  if (!isMobile) return
  await page.goto('/')
  await page.getByRole('navigation', { name: '主要功能' }).getByRole('button', { name: '设置' }).click()
  await page.getByRole('button', { name: /导航栏设置/ }).click()
  const dialog = page.getByRole('dialog', { name: '导航栏设置' })
  await dialog.getByRole('button', { name: '4项' }).click()
  await dialog.getByLabel('导航位置 2').selectOption('statistics')
  await expect(page.getByRole('navigation', { name: '主要功能' }).getByRole('button')).toHaveCount(4)
  await dialog.getByRole('button', { name: '将当前导航设置为默认' }).click()
  await expect(dialog.getByRole('status')).toContainText('已设为默认导航')
  await dialog.getByRole('button', { name: '关闭导航栏设置' }).click()
  // Switching position 2 from Notes to Statistics keeps Anniversaries in the bar; Notes becomes the sole extra.
  const extras = page.locator('.mobile-nav-settings-group')
  await expect(extras.getByRole('button', { name: '笔记', exact: true })).toBeVisible()
  await expect(extras.getByRole('button', { name: '纪念日', exact: true })).toHaveCount(0)
})

test('backup includes only synced default navigation, not device-local layout', () => {
  expect(app).toContain('mixedPoolItemIds,defaultMobileNavigation:syncedDefaultMobileNav})')
  expect(app).not.toContain('mixedPoolItemIds,defaultMobileNavigation:mobileNav})')
})

test('desktop and mobile navigation have distinct selectors so mobile locators stay unique', () => {
  const navigation = fs.readFileSync('src/features/navigation/MobileNavigation.tsx', 'utf8')
  expect(navigation).toContain('className="bottom-nav"')
  expect(navigation).toContain('className="desktop-navigation"')
  expect(navigation).toContain('aria-label={mobileNavLabel(id)}')
  expect(navigation).not.toContain('className="bottom-nav desktop-navigation"')
})
