import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

test('focus history presents tag as primary identity and source as secondary metadata', () => {
  const app = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8')
  expect(app).toContain('className="focus-history-primary"')
  expect(app).toContain("record.kind==='task'?`任务 · ${record.title}`:'自由专注'")
})

test('mobile encouragement actions keep a full-width right-aligned action row', () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), 'src/App.css'), 'utf8')
  expect(css).toContain('.encouragement-item>div{width:100%;justify-content:flex-end}')
})
