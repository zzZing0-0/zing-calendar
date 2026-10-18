import { expect, test, type Page } from '@playwright/test'

const destinations = [
  ['日历', '.calendar-card'], ['笔记', '.notes-page'], ['习惯', '.habits-page'],
  ['纪念日', '.anniversary-page'], ['统计', '.statistics-page'], ['设置', '.settings-page'],
] as const

async function navigate(page: Page, label: string, desktop: boolean) {
  const nav = page.getByRole('navigation', { name: desktop ? '电脑端导航' : '底部导航' })
  // Some mobile destinations live in Settings according to the user's existing layout.
  if (desktop) return nav.getByRole('button', { name: label, exact: true }).click()
  const bottom = page.locator('.bottom-nav')
  const button = bottom.getByRole('button', { name: label, exact: true })
  if (await button.count()) return button.click()
  await bottom.getByRole('button', { name: '设置', exact: true }).click()
  await page.locator('.settings-destination-link').filter({ hasText: label }).click()
}

for (const width of [390, 1440]) {
  test(`all six workspaces share controls and heading tokens at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('/')
    let headingStyle: unknown
    for (const [label, selector] of destinations) {
      await navigate(page, label, width > 700)
      const workspace = page.locator(selector)
      await expect(workspace).toBeVisible()
      expect(await workspace.locator('.ui-button').count()).toBeGreaterThan(0)
      await expect(workspace.locator('button:not(.ui-button)')).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      if (label !== '日历') {
        const heading = workspace.locator('.ui-page-heading')
        await expect(heading).toBeVisible()
        const style = await heading.evaluate(element => {
          const headingStyle = getComputedStyle(element)
          const titleStyle = getComputedStyle(element.querySelector('h2')!)
          return { background: headingStyle.backgroundColor, radius: headingStyle.borderRadius,
            color: titleStyle.color, size: titleStyle.fontSize, font: titleStyle.fontFamily }
        })
        if (headingStyle) expect(style).toEqual(headingStyle)
        headingStyle = style
      }
    }
    expect(errors).toEqual([])
  })
}

test('shared primary actions consume the same accent token', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => document.documentElement.style.setProperty('--color-accent', '#123456'))
  for (const [label, selector] of [['笔记', '.notes-page'], ['习惯', '.habits-page']] as const) {
    await page.locator('.bottom-nav').getByRole('button', { name: label, exact: true }).click()
    const primary = page.locator(selector).locator('button[data-variant="primary"]').first()
    await expect(primary).toHaveCSS('background-color', 'rgb(18, 52, 86)')
    await expect(primary).toHaveCSS('color', 'rgb(255, 255, 255)')
    await expect(primary).toHaveAttribute('type', 'button')
  }
})

test('task, journal, anniversary and tag dialogs retain accessible titles through the shared header', async ({ page }) => {
  await page.goto('/')
  await page.locator('.continuous-calendar .day-cell.today').first().click()
  const drawer = page.locator('.day-drawer')
  for (const [action, name] of [['＋ 添加任务', '添加任务'], ['＋ 添加记录', '添加记录']] as const) {
    await drawer.getByRole('button', { name: action, exact: true }).click()
    const dialog = page.getByRole('dialog', { name, exact: true })
    await expect(dialog).toBeVisible()
    const titleId = await dialog.getAttribute('aria-labelledby')
    expect(titleId).toBeTruthy()
    await expect(dialog.locator(`[id="${titleId}"]`)).toHaveCount(1)
    await dialog.locator('.close-button').click()
  }
  await drawer.getByRole('button', { name: '关闭', exact: true }).click()
  await navigate(page, '纪念日', false)
  await page.locator('.anniversary-page .page-add-button').click()
  const anniversary = page.locator('.anniversary-editor')
  await expect(anniversary).toHaveAccessibleName(/纪念日/)
  await anniversary.locator('.close-button').click()
  await navigate(page, '设置', false)
  await page.getByRole('button', { name: /标签管理/ }).click()
  await expect(page.locator('.compact-tag-manager')).toHaveAccessibleName(/标签/)
})
