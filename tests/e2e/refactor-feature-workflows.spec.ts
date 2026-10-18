import { expect, test } from '@playwright/test'

test('extracted tag controller commits edits, cancels drafts and retains identity after reload', async ({ page }) => {
  await page.goto('/')
  const openManager = async () => {
    await page.locator('.bottom-nav').getByRole('button', { name: '设置', exact: true }).click()
    await page.getByRole('button', { name: /标签管理/ }).click()
  }
  await openManager()
  const manager = page.locator('.compact-tag-manager')
  await manager.getByPlaceholder('新建共享').fill('模块化标签')
  await manager.getByRole('button', { name: '添加', exact: true }).click()
  await manager.getByRole('button', { name: '模块化标签', exact: true }).click()
  const editor = page.getByRole('dialog', { name: '编辑标签', exact: true })
  await editor.getByLabel('名称', { exact: true }).fill('取消的名称')
  await editor.getByRole('button', { name: '关闭编辑标签', exact: true }).click()
  await expect(manager.getByRole('button', { name: '模块化标签', exact: true })).toBeVisible()
  await manager.getByRole('button', { name: '模块化标签', exact: true }).click()
  await editor.getByLabel('名称', { exact: true }).fill('已保存标签')
  await editor.getByRole('button', { name: '保存', exact: true }).click()
  await expect(manager.getByRole('button', { name: '已保存标签', exact: true })).toBeVisible()
  const before = await page.evaluate(async () => {
    const db = await import('/src/db/calendar.ts')
    return (await db.loadTags()).find((tag: { name: string }) => tag.name === '已保存标签')
  })
  expect(before?.id).toBeTruthy()
  await page.reload()
  await openManager()
  await expect(manager.getByRole('button', { name: '已保存标签', exact: true })).toBeVisible()
  const after = await page.evaluate(async () => {
    const db = await import('/src/db/calendar.ts')
    return (await db.loadTags()).find((tag: { name: string }) => tag.name === '已保存标签')
  })
  expect(after).toEqual(before)
})

test('search controller filters and navigates to notes, closes on Escape, and survives workspace changes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: '电脑端导航' })
  await nav.getByRole('button', { name: '笔记', exact: true }).click()
  await page.getByRole('button', { name: '＋ 新建', exact: true }).click()
  const editor = page.locator('.note-editor')
  await editor.getByRole('textbox', { name: '笔记标题' }).fill('搜索模块回归')
  await editor.getByRole('button', { name: '完成', exact: true }).click()
  await nav.getByRole('button', { name: '设置', exact: true }).click()
  const search = page.getByRole('textbox', { name: '全局搜索' })
  await search.fill('搜索模块')
  const panel = page.locator('.search-panel')
  await expect(panel.locator('.search-result')).toHaveCount(1)
  await expect(panel.locator('mark').first()).toHaveText('搜索模块')
  await panel.locator('.search-filters').getByRole('button', { name: '任务', exact: true }).click()
  await expect(panel.locator('.search-result')).toHaveCount(0)
  await panel.locator('.search-filters').getByRole('button', { name: '笔记', exact: true }).click()
  await expect(panel.locator('.search-result')).toHaveCount(1)
  await search.press('Escape')
  await expect(panel).toBeHidden()
  await search.blur()
  await search.focus()
  await panel.locator('.search-result').click()
  await expect(editor).toBeVisible()
  await expect(editor.getByRole('textbox', { name: '笔记标题' })).toHaveValue('搜索模块回归')
  await expect(panel).toBeHidden()
})

for (const kind of ['free', 'task'] as const) {
test(`shared ${kind} focus editor validates and persists intervals while preserving identity and context`, async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.continuous-calendar')).toBeVisible()
  await page.evaluate(async kind => {
    const db = await import('/src/db/calendar.ts')
    const start = new Date(); start.setHours(9, 0, 0, 0)
    const end = new Date(start.getTime() + 30 * 60_000)
    if (kind === 'task') await db.saveTasks([{ id: 'refactor-task', title: '保留任务上下文',
      date: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
      priority: 0, allDay: true, status: 'todo', tagIds: ['default'],
      createdAt: start.toISOString(), updatedAt: end.toISOString() }])
    await db.saveFocusSessions([{ id: 'refactor-focus', tagIds: ['default'], mode: 'stopwatch',
      startedAt: start.toISOString(), endedAt: end.toISOString(), durationSeconds: 1800,
      createdAt: start.toISOString(), updatedAt: end.toISOString(),
      ...(kind === 'task' ? { context: { kind: 'task', taskId: 'refactor-task' } } : {}) }])
  }, kind)
  await page.reload()
  await page.locator('.continuous-calendar .day-cell.today').first().click()
  await page.locator('.day-focus-button').click()
  let history = page.getByRole('dialog', { name: '专注记录', exact: true })
  if (kind === 'task') {
    await history.getByRole('button', { name: '查看', exact: true }).click()
    history = page.locator('.task-viewer')
    await history.locator('.task-focus-card .ui-focus-card-history').click()
  }
  await expect(history.locator('.focus-history-item')).toHaveCount(1)
  await history.getByRole('button', { name: '更改', exact: true }).click()
  const startInput = history.getByLabel('开始', { exact: true })
  const endInput = history.getByLabel('结束', { exact: true })
  const originalStart = await startInput.inputValue()
  await endInput.fill(originalStart)
  await history.getByRole('button', { name: '保存', exact: true }).click()
  await expect(history.locator('.focus-history-edit-error')).toBeVisible()
  await endInput.fill(originalStart.slice(0, 11) + '09:45')
  await history.getByRole('button', { name: '保存', exact: true }).click()
  await expect(history.locator('.focus-history-edit')).toHaveCount(0)
  await expect.poll(async () => page.evaluate(async () => {
    const db = await import('/src/db/calendar.ts')
    return (await db.loadFocusSessions()).find((session: { id: string }) => session.id === 'refactor-focus')?.durationSeconds
  })).toBe(2700)
  const stored = await page.evaluate(async () => {
    const db = await import('/src/db/calendar.ts')
    return (await db.loadFocusSessions()).find((session: { id: string }) => session.id === 'refactor-focus')
  })
  expect(stored?.mode).toBe('stopwatch')
  expect(stored?.context).toEqual(kind === 'task' ? { kind: 'task', taskId: 'refactor-task' } : undefined)
  expect(stored?.createdAt).toBe(stored?.startedAt)
})

}

test('the existing date preference updates feature presentation and survives reload without changing note data', async ({ page }) => {
  await page.goto('/')
  await page.locator('.bottom-nav').getByRole('button', { name: '笔记', exact: true }).click()
  await page.getByRole('button', { name: '＋ 新建', exact: true }).click()
  const editor = page.locator('.note-editor')
  await editor.getByRole('textbox', { name: '笔记标题' }).fill('日期偏好回归')
  await editor.getByRole('button', { name: '完成', exact: true }).click()
  // Compare canonical hydrated records on both sides of the preference change.
  await page.reload()
  await page.locator('.bottom-nav').getByRole('button', { name: '笔记', exact: true }).click()
  const before = await page.evaluate(async () => {
    const db = await import('/src/db/calendar.ts')
    return (await db.loadNotes()).find((note: { title: string }) => note.title === '日期偏好回归')
  })
  const dates = await page.evaluate(() => ({
    dmy: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    mdy: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
  }))
  await expect(page.locator('.note-row').filter({ hasText: '日期偏好回归' })).toContainText(dates.dmy)
  await page.locator('.bottom-nav').getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('button', { name: 'Sep 22, 2026', exact: true }).click()
  await page.locator('.bottom-nav').getByRole('button', { name: '笔记', exact: true }).click()
  await expect(page.locator('.note-row').filter({ hasText: '日期偏好回归' })).toContainText(dates.mdy)
  await page.reload()
  await page.locator('.bottom-nav').getByRole('button', { name: '笔记', exact: true }).click()
  await expect(page.locator('.note-row').filter({ hasText: '日期偏好回归' })).toContainText(dates.mdy)
  const after = await page.evaluate(async () => {
    const db = await import('/src/db/calendar.ts')
    return { note: (await db.loadNotes()).find((note: { title: string }) => note.title === '日期偏好回归'),
      dateFormat: localStorage.getItem('zing:dateFormat') }
  })
  expect(after.note).toEqual(before)
  expect(after.dateFormat).toBe('mdy')
})
