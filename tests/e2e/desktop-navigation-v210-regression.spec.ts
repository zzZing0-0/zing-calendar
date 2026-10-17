import { expect, test } from '@playwright/test'
import fs from 'node:fs'

const app = fs.readFileSync('src/App.tsx', 'utf8')
const navigation = fs.readFileSync('src/features/navigation/MobileNavigation.tsx', 'utf8')
const css = fs.readFileSync('src/features/navigation/navigation.css', 'utf8')
const settings = fs.readFileSync('src/features/navigation/MobileNavigationSettings.tsx', 'utf8')

test('desktop navigation lives inside the existing header, never in the floating footer', () => {
  const header = app.slice(app.indexOf('<header className={`topbar'), app.indexOf('</header>', app.indexOf('<header className={`topbar')))
  expect(header).toContain('<DesktopNavigation active={mainView}')
  expect(app.slice(app.indexOf('<MobileNavigation config={mobileNav}'), app.indexOf('<MobileNavigation config={mobileNav}') + 240)).not.toContain('<DesktopNavigation')
  expect(css).toMatch(/\.topbar \{\s*position:sticky; top:0;/)
  expect(css).toContain('.topbar .desktop-navigation {')
  expect(navigation).toContain("['calendar', 'notes', 'anniversaries', 'statistics', 'settings']")
})

test('mobile settings are concise and statistics is a direct settings row', () => {
  expect(settings).toContain('<strong>数量</strong>')
  expect(settings).not.toContain('导航数量')
  expect(settings).not.toContain('· 固定')
  expect(app).not.toContain('MobileNavigationExtras')
  expect(app).toContain("onClick={() => switchMainView('statistics')}")
  expect(app).not.toContain('其他功能')
})

test('desktop navigation stays in the header at wide viewport', async ({ page, isMobile }) => {
  if (isMobile) return
  await page.goto('/')
  const nav = page.locator('.topbar .desktop-navigation')
  await expect(nav.getByRole('button')).toHaveCount(5)
  await nav.getByRole('button', { name: '统计' }).click()
  await expect(nav.getByRole('button', { name: '统计' })).toHaveClass(/active/)
  await expect(nav).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 500))
  const box = await nav.boundingBox()
  expect(box?.y).toBeGreaterThanOrEqual(0)
})


test('desktop navigation is text-only, compact, and ordered between brand and search', () => {
  const desktop = navigation.slice(navigation.indexOf('export function DesktopNavigation'))
  expect(desktop).not.toContain('mobileNavIcon(id)')
  expect(desktop).toContain('{mobileNavLabel(id)}')
  expect(css).toContain('.topbar .desktop-navigation button.active::after')
  expect(css).toContain('.topbar .global-search-wrap {')
  expect(css).toContain('order:2; flex:1 1 220px')
  expect(css).toContain('.topbar .desktop-navigation {')
  expect(css).toContain('order:1; display:flex; position:static')
  expect(css).toContain('top:0; z-index:80')
  expect(css).toContain('max-width:1080px')
})

test('desktop header navigation uses text labels and keeps search accessible', async ({ page, isMobile }) => {
  if (isMobile) return
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const nav = page.locator('.topbar .desktop-navigation')
  await expect(nav.locator('svg')).toHaveCount(0)
  await expect(nav.getByRole('button')).toHaveCount(5)
  const navBox = await nav.boundingBox()
  const searchBox = await page.getByRole('textbox', { name: '全局搜索' }).boundingBox()
  expect(navBox).not.toBeNull()
  expect(searchBox).not.toBeNull()
  expect(navBox!.x + navBox!.width).toBeLessThanOrEqual(searchBox!.x + 2)
  await nav.getByRole('button', { name: '笔记' }).click()
  await expect(nav.getByRole('button', { name: '笔记' })).toHaveClass(/active/)
})


test('desktop branding remains visible in settings and header matches page canvas', async ({ page, isMobile }) => {
  if (isMobile) return
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.locator('.topbar .desktop-navigation').getByRole('button', { name: '设置' }).click()
  await expect(page.locator('.topbar .brand-mark-desktop')).toBeVisible()
  const header = page.locator('.topbar')
  const background = await header.evaluate(element => getComputedStyle(element).backgroundColor)
  expect(background).toBe('rgb(245, 247, 244)')
})

test('desktop sticky page controls reserve the global header height', async ({ page, isMobile }) => {
  if (isMobile) return
  for (const width of [1440, 900]) {
    await page.setViewportSize({ width, height: 750 })
    await page.goto('/')
    const headerHeight = await page.locator('.topbar').evaluate(element => element.getBoundingClientRect().height)
    const calendarOffset = await page.locator('.calendar-sticky-header').evaluate(element => parseFloat(getComputedStyle(element).top))
    expect(calendarOffset).toBeGreaterThanOrEqual(headerHeight)
    await page.locator('.topbar .desktop-navigation').getByRole('button', { name: '统计' }).click()
    const statsOffset = await page.locator('.statistics-page .stats-range').evaluate(element => parseFloat(getComputedStyle(element).top))
    expect(statsOffset).toBeGreaterThanOrEqual(headerHeight)
    await page.locator('.topbar .desktop-navigation').getByRole('button', { name: '纪念日' }).click()
    const anniversaryOffset = await page.locator('.anniversary-page .page-heading').evaluate(element => parseFloat(getComputedStyle(element).top))
    expect(anniversaryOffset).toBeGreaterThanOrEqual(headerHeight)
  }
})
