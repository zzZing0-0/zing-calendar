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

test('record viewer distinguishes calendar ownership date from actual creation timestamp',()=>{
  expect(app).toContain('属于 {viewingJournal.date} · 记录于 {new Date(viewingJournal.createdAt).toLocaleString()}')
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
  await expect(calendarTask.getByText('顶部问候语',{exact:true})).toBeVisible()
  await expect(calendarTask.getByText('每周开始日',{exact:true})).toBeVisible()
  await expect(calendarTask.getByText('日期格式',{exact:true})).toBeVisible()
  await expect(calendarTask.getByText('重复任务显示',{exact:true})).toBeVisible()
  await expect(calendarTask.getByText('新任务默认优先级',{exact:true})).toBeVisible()
})
