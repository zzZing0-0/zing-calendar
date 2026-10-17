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
  expect(css).toContain('.topbar { position:sticky; top:0;')
  expect(css).toContain('.desktop-navigation { display:flex; position:static;')
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
