import { expect, test } from '@playwright/test'
import fs from 'node:fs'

const app = fs.readFileSync('src/App.tsx', 'utf8')

test('active focus session auto-navigation is once per session, not once per task or note mutation', () => {
  expect(app).toContain('const routedFocusSessionIdRef = useRef<string | null>(null)')
  expect(app).toContain('if (routedFocusSessionIdRef.current === activeFocusSession.id) return')
  expect(app).toContain('routedFocusSessionIdRef.current = activeFocusSession.id')
  expect(app).toContain("if(activeFocusNote){setFocusOpen(false);setMainView('notes');setRequestedNoteId(activeFocusNote.id);return}")
})

test('adding a task while free focus runs does not reopen its dismissed focus panel', async ({ page }) => {
  await page.goto('/')
  await page.locator('.focus-trigger').click()
  const panel = page.locator('.focus-panel')
  await panel.getByRole('button', { name: '▶ 开始专注' }).click()
  await panel.getByRole('button', { name: '关闭专注界面' }).click()
  await expect(panel).toBeHidden()
  const today = page.locator('.continuous-calendar .day-cell.today').first()
  await today.click()
  const drawer = page.locator('.day-drawer')
  await drawer.getByRole('button', { name: '＋ 添加任务', exact: true }).click()
  const editor = page.getByRole('dialog', { name: '添加任务' })
  await editor.getByPlaceholder('要做什么？').fill('专注中添加的任务')
  await editor.getByRole('button', { name: '保存任务', exact: true }).click()
  await expect(drawer.locator('.task-item').filter({ hasText: '专注中添加的任务' })).toBeVisible()
  await expect(panel).toBeHidden()
  await expect(page.locator('.focus-trigger')).toContainText('专注')
})
