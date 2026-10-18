import { expect, test } from '@playwright/test'
import { readApplicationSource, readStylesheet } from '../helpers/applicationSource'

test('focus history presents tag as primary identity and source as secondary metadata', () => {
  const app = readApplicationSource()
  expect(app).toContain('className="focus-history-primary"')
  expect(app).toContain("record.kind==='task'?`任务 · ${record.title}`:record.kind==='note'?`笔记 · ${record.title}`:record.kind==='habit'?'习惯专注':'自由专注'")
})

test('mobile encouragement actions keep a full-width right-aligned action row', () => {
  const css = readStylesheet('src/App.css')
  expect(css).toContain('.encouragement-item>div{width:100%;justify-content:flex-end}')
})
