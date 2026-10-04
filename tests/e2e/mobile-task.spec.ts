import { expect, test } from '@playwright/test'

test.describe('mobile task lifecycle regression', () => {
  test('a task can be created, completed, and remains completed after reload', async ({ page }) => {
    await page.goto('/')

    const today = page.locator('.continuous-calendar .day-cell.today').first()
    await expect(today).toBeVisible()
    await today.click()

    const drawer = page.locator('.day-drawer')
    await expect(drawer).toBeVisible()
    await drawer.getByRole('button', { name: '＋ 添加任务', exact: true }).click()

    const editor = page.getByRole('dialog', { name: '添加任务' })
    await expect(editor).toBeVisible()
    const title = 'E2E 自动化测试任务'
    await editor.getByPlaceholder('要做什么？').fill(title)
    await editor.getByRole('button', { name: '保存任务', exact: true }).click()
    await expect(editor).toBeHidden()

    const task = drawer.locator('.task-item').filter({ hasText: title })
    await expect(task).toBeVisible()
    await task.getByRole('button', { name: `完成 ${title}` }).click()
    await expect(task).toHaveClass(/status-completed/)

    // Give the IndexedDB persistence effect one turn before reloading.
    await expect.poll(async () => task.getAttribute('class')).toContain('status-completed')
    await page.waitForTimeout(100)
    await page.reload()

    const todayAfterReload = page.locator('.continuous-calendar .day-cell.today').first()
    await expect(todayAfterReload).toBeVisible()
    await todayAfterReload.click()

    const drawerAfterReload = page.locator('.day-drawer')
    await expect(drawerAfterReload).toBeVisible()
    const persistedTask = drawerAfterReload.locator('.task-item').filter({ hasText: title })
    await expect(persistedTask).toBeVisible()
    await expect(persistedTask).toHaveClass(/status-completed/)
  })
})
