import { expect, test } from '@playwright/test'
import fs from 'node:fs'

const app = fs.readFileSync('src/App.tsx', 'utf8')
const navigation = fs.readFileSync('src/features/navigation/MobileNavigation.tsx', 'utf8')
const css = fs.readFileSync('src/features/navigation/navigation.css', 'utf8')
const settings = fs.readFileSync('src/features/navigation/MobileNavigationSettings.tsx', 'utf8')

test('desktop navigation is a persistent sidebar with search and brand', () => {
  expect(app).toContain('<DesktopNavigationDrawer active={mainView} onNavigate={switchMainView} collapsed={desktopSidebarCollapsed} />')
  expect(app).not.toContain('<DesktopNavigation active={mainView}')
  expect(css).toContain('.desktop-navigation-sidebar')
  expect(css).toContain('position:fixed; inset:0 auto 0 0')
  expect(css).toContain('.topbar .global-search-wrap')
})

test('mobile settings are concise and statistics is a direct settings row', () => {
  expect(settings).toContain('<strong>数量</strong>')
  expect(settings).not.toContain('导航数量')
  expect(settings).not.toContain('· 固定')
  expect(app).not.toContain('MobileNavigationExtras')
  expect(app).toContain("onClick={() => switchMainView('statistics')}")
  expect(app).not.toContain('其他功能')
})

test('desktop sidebar is always visible and navigates without a drawer', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/')
  const sidebar = page.getByRole('navigation', { name: '电脑端导航' })
  await expect(sidebar).toBeVisible()
  await expect(sidebar.getByRole('button')).toHaveCount(6)
  await expect(page.getByRole('searchbox', { name: '全局搜索' })).toBeVisible().catch(async () => {
    await expect(page.getByRole('textbox', { name: '全局搜索' })).toBeVisible()
  })
  await sidebar.getByRole('button', { name: '统计' }).click()
  await expect(sidebar.getByRole('button', { name: '统计' })).toHaveAttribute('aria-current', 'page')
  await expect(sidebar).toBeVisible()
  const navBox = await sidebar.boundingBox()
  expect(navBox?.x).toBeLessThan(250)
})

test('mobile navigation remains separate from desktop drawer', () => {
  expect(navigation).toContain('export function MobileNavigation')
  expect(app).toContain('<MobileNavigation config={mobileNav}')
  expect(css).toContain('@media (max-width:700px)')
})

test('desktop sidebar collapses to SVG icons and restores its width', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/')
  const sidebar = page.getByRole('navigation', { name: '电脑端导航' })
  await expect(sidebar.locator('svg')).toHaveCount(6)
  const toggle = page.getByRole('button', { name: '折叠侧边栏' })
  await toggle.click()
  await expect(page.locator('.app-shell')).toHaveClass(/sidebar-collapsed/)
  await expect(sidebar.getByRole('button', { name: '日历' })).toBeVisible()
  await expect(page.getByRole('button', { name: '展开侧边栏' })).toBeVisible()
  await page.reload()
  await expect(page.locator('.app-shell')).toHaveClass(/sidebar-collapsed/)
  await page.getByRole('button', { name: '展开侧边栏' }).click()
  await expect(page.locator('.app-shell')).not.toHaveClass(/sidebar-collapsed/)
})

test('desktop sidebar does not overlap calendar or settings content', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 })
  await page.goto('/')
  const sidebar = page.getByRole('navigation', { name: '电脑端导航' })
  const navBox = await sidebar.boundingBox()
  const calendarBox = await page.getByRole('region', { name: '月历' }).boundingBox()
  expect(navBox).not.toBeNull()
  expect(calendarBox).not.toBeNull()
  expect(calendarBox!.x).toBeGreaterThan(navBox!.x + navBox!.width)
  await sidebar.getByRole('button', { name: '设置' }).click()
  const settingsBox = await page.locator('.settings-page').boundingBox()
  expect(settingsBox).not.toBeNull()
  expect(settingsBox!.x).toBeGreaterThan(navBox!.x + navBox!.width)
})


test('collapsed sidebar hides search entirely and expanded sidebar restores it', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/')
  const search = page.locator('.topbar .global-search-wrap')
  await expect(search).toBeVisible()
  await page.getByRole('button', { name: '折叠侧边栏' }).click()
  await expect(search).toBeHidden()
  await page.getByRole('button', { name: '展开侧边栏' }).click()
  await expect(search).toBeVisible()
})

test('desktop calendar header has comfortable vertical padding and contains its controls', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto('/')
  const toolbar = page.locator('.calendar-sticky-header .calendar-toolbar')
  const bounds = await toolbar.boundingBox()
  const month = await page.getByRole('button', { name: '快速选择年月' }).boundingBox()
  const refresh = await page.getByRole('button', { name: '检查并刷新程序' }).boundingBox()
  expect(bounds).not.toBeNull()
  expect(month).not.toBeNull()
  expect(refresh).not.toBeNull()
  expect(bounds!.height).toBeGreaterThanOrEqual(100)
  for (const item of [month!, refresh!]) {
    expect(item.y).toBeGreaterThan(bounds!.y + 8)
    expect(item.y + item.height).toBeLessThan(bounds!.y + bounds!.height - 8)
  }
})
