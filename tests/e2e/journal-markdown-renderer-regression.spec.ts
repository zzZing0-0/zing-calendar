import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

test('journal markdown regression › record viewer renders stored Markdown through the shared renderer', () => {
  const app = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8')
  const css = fs.readFileSync(path.resolve(process.cwd(), 'src/App.css'), 'utf8')
  expect(app).toContain("import { MarkdownRenderer } from './components/markdown/MarkdownRenderer'")
  expect(app).toContain('<div className="journal-view-content"><MarkdownRenderer content={viewingJournal.content}/></div>')
  expect(app).toContain('<span>正文 · Markdown</span>')
  expect(css).toContain('.journal-view-content{white-space:normal')
})
