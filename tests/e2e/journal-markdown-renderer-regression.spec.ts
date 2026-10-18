import { expect, test } from '@playwright/test'
import { readApplicationSource, readStylesheet } from '../helpers/applicationSource'

test('journal markdown regression › record viewer renders stored Markdown through the shared renderer', () => {
  const app = readApplicationSource()
  const css = readStylesheet('src/App.css')
  expect(app).toContain("import { MarkdownRenderer } from '../../components/markdown/MarkdownRenderer'")
  expect(app).toContain('<div className="journal-view-content"><MarkdownRenderer content={viewingJournal.content}/></div>')
  expect(app).toContain('<span>正文 · Markdown</span>')
  expect(css).toContain('.journal-view-content{white-space:normal')
})
