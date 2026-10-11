import { expect, test } from '@playwright/test'
import fs from 'node:fs'

const notesPage = fs.readFileSync('src/features/notes/NotesPage.tsx', 'utf8')
const css = fs.readFileSync('src/App.css', 'utf8')

test('note editor follows notebook status title focus tags media content hierarchy', () => {
  const topbar = notesPage.indexOf('className="note-editor-topbar"')
  const title = notesPage.indexOf('className="note-title-row"')
  const focus = notesPage.indexOf('className="note-focus-row"')
  const tags = notesPage.indexOf('className="note-tag-editor"', focus)
  const media = notesPage.indexOf('className="note-media-toggle-row"')
  const tabs = notesPage.indexOf('className="note-mobile-tabs"')
  const content = notesPage.indexOf('className={`note-split mobile-${mobileMode}`}')
  expect([topbar,title,focus,tags,media,tabs,content].every(index=>index>=0)).toBeTruthy()
  expect(topbar).toBeLessThan(title)
  expect(title).toBeLessThan(focus)
  expect(focus).toBeLessThan(tags)
  expect(tags).toBeLessThan(media)
  expect(media).toBeLessThan(tabs)
  expect(tabs).toBeLessThan(content)
})

test('topbar uses notebook selection while title owns its row and shared date formatter', () => {
  expect(notesPage).toContain('className="note-notebook-select" aria-label="笔记本"')
  expect(notesPage).toContain('className="note-title-row"')
  expect(notesPage).toContain('formatUiDate(new Date(editing.updatedAt))')
  expect(css).toContain('.note-title-row small{position:absolute;right:18px;bottom:5px')
})

test('multimedia is collapsed by default and exposes attachment summary when folded', () => {
  expect(notesPage).toContain('[mediaOpen,setMediaOpen]=useState(false)')
  expect(notesPage).toContain('aria-expanded={mediaOpen}')
  expect(notesPage).toContain('{mediaOpen&&<div className="note-attachments">')
  expect(notesPage).toContain("图片 {(editing.attachments??[]).filter(a=>a.type==='image').length}")
})

test('note focus lock renders above the note editor overlay', () => {
  expect(css).toContain('.notes-overlay,.note-editor-overlay{z-index:240}')
  expect(css).toContain('.focus-layer{z-index:300}')
})
