import { expect, test } from '@playwright/test'

async function createSharedTag(page: import('@playwright/test').Page, name: string) {
  await page.locator('.bottom-nav').getByRole('button', { name: '设置' }).click()
  await page.getByRole('button', { name: /标签管理/ }).click()

  const manager = page.locator('.tag-manager')
  await expect(manager).toBeVisible()
  await manager.getByPlaceholder('新建共享').fill(name)
  await manager.getByRole('button', { name: '添加', exact: true }).click()
  await expect(manager.getByText(name, { exact: true })).toBeVisible()

  await manager.locator('.close-button').click()
  await expect(manager).toBeHidden()
  await page.locator('.bottom-nav').getByRole('button', { name: '日历' }).click()
}

test.describe('mobile focus regression', () => {
  test('the just-used focus tag remains selected after finishing and after reopening Focus', async ({ page }) => {
    await page.goto('/')
    await createSharedTag(page, '英语测试')

    await page.locator('.focus-trigger').click()
    const panel = page.locator('.focus-panel')
    await expect(panel).toBeVisible()

    await panel.locator('.focus-current-tag').click()
    const tagDialog = page.getByRole('dialog', { name: '选择专注标签' })
    await expect(tagDialog).toBeVisible()
    await tagDialog.getByRole('button', { name: /英语测试/ }).click()
    await expect(panel.locator('.focus-current-tag')).toContainText('英语测试')

    await panel.getByRole('button', { name: '▶ 开始专注', exact: true }).click()
    await expect(panel.getByRole('heading', { name: '正在专注' })).toBeVisible()
    await expect(panel.locator('.focus-live-tags')).toContainText('英语测试')

    await panel.getByRole('button', { name: '■ 结束专注', exact: true }).click()
    await expect(panel.getByRole('heading', { name: '开始专注' })).toBeVisible()
    await expect(panel.locator('.focus-current-tag')).toContainText('英语测试')

    await panel.locator('.close-button').click()
    await expect(panel).toBeHidden()

    await page.locator('.focus-trigger').click()
    await expect(panel).toBeVisible()
    await expect(panel.locator('.focus-current-tag')).toContainText('英语测试')
  })
})
