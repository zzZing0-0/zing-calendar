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
