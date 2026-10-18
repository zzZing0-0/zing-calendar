import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import { BUILTIN_MOBILE_NAV, missingMobileNav, normalizeMobileNav, resizeMobileNav, selectMobileNav } from '../../src/features/navigation/navigationConfig'
import { readApplicationSource } from '../helpers/applicationSource'

const app = readApplicationSource()
const storage = fs.readFileSync('src/features/navigation/navigationStorage.ts', 'utf8')

test('mobile navigation normalizes malformed values and preserves fixed ends', () => {
  expect(normalizeMobileNav({ itemCount: 4, middleItems: ['statistics', 'statistics', 'unknown'] })).toEqual({ itemCount: 4, middleItems: ['statistics', 'notes'], hiddenItems: ['habits', 'anniversaries'] })
  expect(normalizeMobileNav({ itemCount: 5, middleItems: ['notes', 'anniversaries', 'statistics'], hiddenItems: ['habits'] })).toEqual({ itemCount: 5, middleItems: ['notes', 'anniversaries', 'statistics'], hiddenItems: ['habits'] })
  expect(missingMobileNav({ itemCount: 4, middleItems: ['notes', 'statistics'] })).toEqual(['habits', 'anniversaries'])
})

test('mobile navigation swaps occupied entries and extends four to five', () => {
  const four = resizeMobileNav(BUILTIN_MOBILE_NAV, 4)
  expect(four.middleItems).toEqual(['notes', 'habits'])
  expect(selectMobileNav(four, 0, 'anniversaries').middleItems).toEqual(['anniversaries', 'habits'])
  expect(resizeMobileNav(four, 5).middleItems).toEqual(['notes', 'habits', 'anniversaries'])
})

test('navigation is modular, only default template syncs, and desktop keeps all existing entries', () => {
  expect(app).toContain('<MobileNavigation config={mobileNav}')
  expect(app).toContain('<DesktopNavigationDrawer active={mainView}')
  expect(app).toContain('<MobileNavigationSettings')
  expect(app).toContain('defaultMobileNavigation: syncedDefaultMobileNav')
  expect(app).not.toContain('defaultMobileNavigation: mobileNav,')
  expect(storage).toContain('if (localStorage.getItem(LOCAL_KEY) !== null) return null')
})

test('mobile navigation settings save default and shortcuts follow hidden destinations', async ({ page, isMobile }) => {
  if (!isMobile) return
  await page.goto('/')
  await page.getByRole('navigation', { name: '主要功能' }).getByRole('button', { name: '设置' }).click()
  const group = page.locator('.mobile-nav-settings-group')
  await expect(group.getByRole('button', { name: '统计', exact: true })).toBeVisible()
  await expect(group.getByRole('button', { name: '纪念日', exact: true })).toBeVisible()
  await expect(group.getByText('其他功能')).toHaveCount(0)
  await page.getByRole('button', { name: '底部导航' }).click()
  const dialog = page.getByRole('dialog', { name: '导航栏设置' })
  // Drag handles replaced the legacy move buttons. Verify the 4–5 item invariant
  // through real pointer interactions, rather than asserting removed button labels.
  const dragTo = async (name: string, targetArea: 'shown' | 'hidden') => {
    const handle = dialog.getByRole('button', { name: `拖动${name}` })
    const zone = dialog.locator(`[data-nav-area="${targetArea}"].mobile-nav-dropzone`)
    const from = await handle.boundingBox()
    const to = await zone.boundingBox()
    if (!from || !to) throw new Error(`Cannot drag ${name} into ${targetArea}`)
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    await page.mouse.move(to.x + to.width / 2, to.y + to.height - 8, { steps: 12 })
    await page.mouse.up()
  }
  // With four entries, dragging one out cannot remove it.
  await dragTo('习惯', 'hidden')
  await expect(dialog.locator('[data-nav-area="shown"] [data-nav-index]')).toHaveCount(2)
  await dragTo('统计', 'shown')
  await expect(dialog.locator('[data-nav-area="shown"] [data-nav-index]')).toHaveCount(3)
  await dragTo('习惯', 'hidden')
  await expect(dialog.locator('[data-nav-area="shown"] [data-nav-index]')).toHaveCount(2)
  const bottomNav = page.getByRole('navigation', { name: '主要功能' })
  await expect(bottomNav.getByRole('button')).toHaveCount(4)
  await expect(bottomNav.getByRole('button', { name: '统计', exact: true })).toBeVisible()
  await expect(bottomNav.getByRole('button', { name: '习惯', exact: true })).toHaveCount(0)
  await dialog.getByRole('button', { name: '将当前导航设置为默认' }).click()
  await expect(dialog.getByRole('status')).toContainText('已设为默认导航')
  await dialog.getByRole('button', { name: '关闭导航栏设置' }).click()
  await expect(dialog).toHaveCount(0)
  await page.getByRole('navigation', { name: '主要功能' }).getByRole('button', { name: '设置' }).click()
  await expect(group.getByRole('button', { name: '统计', exact: true })).toHaveCount(0)
  await expect(group.getByRole('button', { name: '习惯', exact: true })).toBeVisible()
  await expect(group.getByRole('button', { name: '纪念日', exact: true })).toBeVisible()
})

test('backup includes only synced default navigation, not device-local layout', () => {
  expect(app).toMatch(/mixedPoolItemIds,defaultMobileNavigation\s*:\s*syncedDefaultMobileNav(?=\s*[,}])/)
  expect(app).not.toMatch(/mixedPoolItemIds,defaultMobileNavigation\s*:\s*mobileNav(?=\s*[,}])/)
})

test('desktop and mobile navigation have distinct selectors so mobile locators stay unique', () => {
  const navigation = fs.readFileSync('src/features/navigation/MobileNavigation.tsx', 'utf8')
  expect(navigation).toContain('className="bottom-nav"')
  expect(navigation).toContain('className="desktop-navigation"')
  expect(navigation).toContain('aria-label={mobileNavLabel(id)}')
  expect(navigation).not.toContain('className="bottom-nav desktop-navigation"')
})

// The chevron is decorative: the Settings shortcut must have an exact accessible name.
test('settings shows shortcuts for all hidden navigation destinations', () => {
  expect(app).toContain('missingMobileNav(mobileNav).map(page =>')
  expect(app).toContain('aria-label={mobileNavLabel(page)}')
  expect(app).toContain('switchMainView(page)')
})
