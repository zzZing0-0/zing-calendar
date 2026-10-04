import { expect, test } from '@playwright/test'

async function stableDay(page: import('@playwright/test').Page, index: number) {
  const calendar = page.locator('.continuous-calendar')
  const candidate = calendar.locator('.day-cell').nth(index)
  await expect(candidate).toBeVisible()
  const dateKey = await candidate.getAttribute('data-date-key')
  if (!dateKey) throw new Error(`day-cell at index ${index} has no data-date-key`)
  return calendar.locator(`.day-cell[data-date-key="${dateKey}"]`)
}

test.describe('mobile calendar day-detail regression', () => {
  test('a selected day can be closed and reopened repeatedly without losing selection', async ({ page }) => {
    await page.goto('/')

    const calendar = page.locator('.continuous-calendar')
    await expect(calendar).toBeVisible()

    // Capture the date identity once. The continuous calendar may scroll/re-render
    // when Day Detail opens, so nth() must not be used as a persistent identity.
    const day = await stableDay(page, 10)

    await day.click()
    await expect(page.locator('.day-drawer')).toBeVisible()
    await expect(day).toHaveClass(/selected/)
    await expect(page.locator('.bottom-nav')).toBeHidden()

    await page.getByRole('button', { name: '关闭', exact: true }).click()
    await expect(page.locator('.day-drawer')).toBeHidden()
    await expect(day).toHaveClass(/selected/)
    await expect(page.locator('.bottom-nav')).toBeVisible()

    await day.click()
    await expect(page.locator('.day-drawer')).toBeVisible()
    await expect(day).toHaveClass(/selected/)

    await page.getByRole('button', { name: '关闭', exact: true }).click()
    await expect(page.locator('.day-drawer')).toBeHidden()
    await expect(day).toHaveClass(/selected/)

    await day.click()
    await expect(page.locator('.day-drawer')).toBeVisible()
    await expect(day).toHaveClass(/selected/)
  })

  test('selection moves between dates and the calendar remains scrollable after closing detail', async ({ page }) => {
    await page.goto('/')

    const calendar = page.locator('.continuous-calendar')
    await expect(calendar).toBeVisible()

    const firstDay = await stableDay(page, 10)
    const secondDay = await stableDay(page, 13)

    await firstDay.click()
    await expect(firstDay).toHaveClass(/selected/)

    await page.getByRole('button', { name: '关闭', exact: true }).click()
    await expect(page.locator('.day-drawer')).toBeHidden()
    await expect(firstDay).toHaveClass(/selected/)

    await secondDay.click()
    await expect(secondDay).toHaveClass(/selected/)
    await expect(firstDay).not.toHaveClass(/selected/)

    await page.getByRole('button', { name: '关闭', exact: true }).click()
    await expect(page.locator('.day-drawer')).toBeHidden()
    await expect(secondDay).toHaveClass(/selected/)

    const before = await page.evaluate(() => window.scrollY)
    await page.mouse.wheel(0, 600)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before)
  })
})
