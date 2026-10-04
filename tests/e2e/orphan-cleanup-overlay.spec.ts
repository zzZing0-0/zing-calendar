import { expect, test } from '@playwright/test'

test.describe('orphan cleanup overlay regression', () => {
  test('preview dialog stays interactive above its backdrop', async ({ page }) => {
    await page.route('**/api/b2-gc', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ scanned: 0, orphans: [] }),
      })
    })

    await page.goto('/')
    await page.locator('.bottom-nav').getByRole('button', { name: /设置/ }).click()
    await page.getByRole('button', { name: /清理 B2 孤儿附件/ }).click()

    const dialog = page.getByRole('dialog', { name: '孤儿附件检查' })
    await expect(dialog).toBeVisible()

    // This click previously hit the full-screen backdrop instead of the dialog.
    await dialog.locator('.close-button').click()
    await expect(dialog).toBeHidden()
  })
})
