import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
const app=fs.readFileSync(path.resolve('src/App.tsx'),'utf8')

test('record editor order is title, score, emotions, body, images, audio, tags with no editable date/time',()=>{
  const start=app.indexOf('{journalEditorOpen &&')
  const end=app.indexOf('{editorOpen &&',start)
  const editor=app.slice(start,end)
  const labels=['标题 *','事件影响','具体感受 · 可选 · 最多 3 个','正文 · Markdown','图片 · 最多 9 张','录音 · 最多 1 条 / 30 分钟','标签']
  const positions=labels.map(label=>editor.indexOf(label))
  expect(positions.every(x=>x>=0)).toBe(true)
  expect(positions).toEqual([...positions].sort((a,b)=>a-b))
  expect(editor).not.toContain('<span>日期</span>')
  expect(editor).not.toContain('<span>时间</span>')
})

test('record viewer keeps ownership date subtle and groups emotions with impact score',()=>{
  const start=app.indexOf('{viewingJournal &&')
  const end=app.indexOf('{journalEditorOpen &&',start)
  const viewer=app.slice(start,end)
  expect(viewer).toContain('className="journal-view-date-meta"')
  expect(viewer).not.toContain('journal-view-date-rule')
  expect(viewer).toContain('formatUiDate(fromDateKey(viewingJournal.date))')
  expect(viewer).not.toContain('记录于')
  expect(viewer).not.toContain('属于 {viewingJournal.date}')
  expect(viewer).toContain('className="journal-view-feeling-row"')
  expect(viewer.indexOf('emotion-chip')).toBeLessThan(viewer.indexOf('impact-badge'))
})


test('record and message dates share the global English date-format preference',()=>{
  const start=app.indexOf('{viewingJournal &&')
  const end=app.indexOf('{journalEditorOpen &&',start)
  const viewer=app.slice(start,end)
  expect(app).toContain("dateFormat === 'mdy'")
  expect(app).toContain('`${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`')
  expect(viewer).toContain('formatUiDate(fromDateKey(viewingJournal.date))')
  expect(viewer).toContain('formatUiDate(new Date(message.createdAt))')
  expect(viewer).toContain("toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})")
})

test('record editor opens emotions in a dedicated picker instead of rendering the vocabulary inline',()=>{
  const start=app.indexOf('{journalEditorOpen &&')
  const end=app.indexOf('{editorOpen &&',start)
  const editor=app.slice(start,end)
  expect(editor).toContain('className="journal-emotion-trigger"')
  expect(editor).toContain('onClick={()=>setEmotionPickerOpen(true)}')
  expect(editor).not.toContain('className="emotion-groups"')
  expect(app).toContain('aria-label="选择具体感受"')
  expect(app).toContain('已选择 {journalDraft.emotionIds.length}/3')
})

test('emotion manager is positive-first, collapsible, and adds directly into a chosen group',()=>{
  const start=app.indexOf('{emotionManagerOpen &&')
  const end=app.indexOf('{encouragementManagerOpen &&',start)
  const manager=app.slice(start,end)
  expect(manager).toContain("(['positive','neutral','negative'] as EmotionGroup[])")
  expect(manager).toContain('emotionManagerExpanded===group')
  expect(manager).toContain('onClick={()=>addEmotionOption(group)}')
  expect(manager).not.toContain('选择分组：负向 / 中性 / 正向')
  expect(manager).toContain('<option value="positive">正向</option>')
  expect(manager).toContain('<option value="neutral">中性</option>')
  expect(manager).toContain('<option value="negative">负向</option>')
})

test('settings groups follow the requested life-system order',()=>{
  const settingsStart=app.indexOf("{mainView === 'settings' &&")
  const settingsEnd=app.indexOf('{githubSyncOpen &&',settingsStart)
  const settings=app.slice(settingsStart,settingsEnd)
  const labels=['日历任务','专注','标签','天气与情绪','鼓励语','词云','云同步','数据','友情链接']
  const positions=labels.map(label=>settings.indexOf(`<h3>${label}</h3>`))
  expect(positions.every(position=>position>=0)).toBe(true)
  expect(positions).toEqual([...positions].sort((a,b)=>a-b))
})


test('reordered settings still render inside the normal app shell', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.continuous-calendar')).toBeVisible()
  const nav=page.locator('.bottom-nav')
  await expect(nav).toBeVisible()
  await nav.getByRole('button',{name:/设置/}).click()
  const settings=page.locator('.settings-page')
  await expect(settings).toBeVisible()
  const groupTitles=settings.locator('.settings-group-title h3:visible')
  await expect(groupTitles).toHaveText(['日历任务','专注','标签','天气与情绪','鼓励语','词云','云同步','数据','友情链接'])
  const calendarTask=settings.locator('.calendar-task-settings')
  await expect(calendarTask).toBeVisible()
  await expect(calendarTask.getByText('顶部问候语',{exact:true})).toBeHidden()
  await expect(calendarTask.getByText('每周开始日',{exact:true})).toBeVisible()
  await expect(calendarTask.getByText('日期格式',{exact:true})).toBeVisible()
  await expect(calendarTask.getByText('重复任务显示',{exact:true})).toBeVisible()
  await expect(calendarTask.getByText('新任务默认优先级',{exact:true})).toBeVisible()
})

test('mobile hides only the greeting setting while keeping calendar-task controls visible', async ({ page }) => {
  await page.setViewportSize({width:390,height:844})
  await page.goto('/')
  await page.locator('.bottom-nav').getByRole('button',{name:/设置/}).click()
  const calendarTask=page.locator('.calendar-task-settings')
  await expect(calendarTask).toBeVisible()
  await expect(calendarTask.getByText('顶部问候语',{exact:true})).toBeHidden()
  await expect(calendarTask.getByText('每周开始日',{exact:true})).toBeVisible()
  await expect(calendarTask.getByText('日期格式',{exact:true})).toBeVisible()
  await expect(calendarTask.getByText('重复任务显示',{exact:true})).toBeVisible()
  await expect(calendarTask.getByText('新任务默认优先级',{exact:true})).toBeVisible()
})

test('mood calendar distinguishes records with follow-up messages using a square thread marker',()=>{
  expect(app).toContain('journalThreadDates.has(key)')
  expect(app).toContain('className="mini-journal-thread-dot"')
  expect(app).toContain('aria-label="当天记录有后续"')
})

test('bottom navigation uses one SVG icon system instead of emoji or character glyphs',()=>{
  const start=app.indexOf('<nav className="bottom-nav"')
  const end=app.indexOf('</nav>',start)
  const nav=app.slice(start,end)
  expect((nav.match(/className="bottom-nav-icon"/g)??[]).length).toBe(4)
  expect(nav).not.toContain('🎂')
  expect(nav).not.toContain('<span>▦</span>')
  expect(nav).not.toContain('<span>⌁</span>')
  expect(nav).not.toContain('<span>⚙</span>')
})

test('record viewer exposes a text-only append-only chat thread with no message edit or delete actions',()=>{
  const start=app.indexOf('{viewingJournal &&')
  const end=app.indexOf('{journalEditorOpen &&',start)
  const viewer=app.slice(start,end)
  expect(viewer).toContain('className="journal-thread"')
  expect(viewer).toContain('aria-label="继续说"')
  expect(viewer).toContain('sendJournalMessage(viewingJournal.id)')
  expect(viewer).toContain('发送后不可修改或删除')
  expect(viewer).not.toContain('编辑消息')
  expect(viewer).not.toContain('删除消息')
  expect(viewer).not.toContain('message.attachments')
})
