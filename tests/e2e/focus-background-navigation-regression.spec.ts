import { expect, test } from '@playwright/test'
import fs from 'node:fs'

const app = fs.readFileSync('src/App.tsx', 'utf8')

test('all focus panels can close while keeping the session running', () => {
  expect(app).toContain('aria-label="关闭专注界面" onClick={()=>setFocusOpen(false)}')
  expect(app).toContain('aria-label="关闭任务详情" onClick={()=>{setTaskFocusHistoryOpen(false);setFocusEditId(null);setViewingTask(null)}}')
  expect(app).toContain('🔒 计时中，结束后可编辑')
  expect(app).toContain('setPendingNoteFocusId(null)\n    setFocusOpen(false)')
})

test('free focus can be dismissed, navigated away from, and reopened without resetting elapsed time', async ({ page }) => {
  await page.goto('/')
  await page.locator('.focus-trigger').click()
  const panel = page.locator('.focus-panel')
  await panel.getByRole('button', { name: '▶ 开始专注' }).click()
  await expect(panel.getByRole('heading', { name: '正在专注' })).toBeVisible()
  await panel.getByRole('button', { name: '关闭专注界面' }).click()
  await expect(panel).toBeHidden()
  await page.locator('.bottom-nav').getByRole('button', { name: '笔记' }).click()
  await page.locator('.bottom-nav').getByRole('button', { name: '日历' }).click()
  await expect(page.locator('.focus-trigger')).toContainText('专注')
  await page.locator('.focus-trigger').click()
  await expect(panel.getByRole('heading', { name: '正在专注' })).toBeVisible()
  await panel.getByRole('button', { name: '■ 结束专注' }).click()
})

test('calendar entry returns note focus to its note without reopening the blocking focus modal', () => {
  expect(app).toContain("if(activeFocusNote){setFocusOpen(false);setMainView('notes');setRequestedNoteId(activeFocusNote.id);return}")
  expect(app).toContain('if(activeTimerTask){setViewingTask(activeTimerTask);return}')
})
