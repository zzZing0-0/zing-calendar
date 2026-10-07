import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { planSyncDiff } from '../../src/domain/sync'

const appSource = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8')

test('notes integration regression › note search results route to Notes instead of Anniversary editor', () => {
  expect(appSource).toContain("if (result.kind === 'note')")
  expect(appSource).toContain("setMainView('notes')")
  expect(appSource).toContain('setRequestedNoteId(result.id)')
})

test('notes integration regression › explicit sync snapshots include note and notebook keys', () => {
  const explicitReadySnapshot = "{ task:true, journal:true, note:true, notebook:true, mood:true, energy:true, environment:true, period:true, tag:true, anniversary:true, focus:true, settings:true }"
  expect(appSource).toContain(explicitReadySnapshot)
  expect(appSource).toContain('note: nextNotes')
  expect(appSource).toContain('notebook: nextNotebooks')
})

test('notes integration regression › GitHub rehydrate loads and applies notes and notebooks', () => {
  expect(appSource).toContain('loadNotes<Note>()')
  expect(appSource).toContain('loadNotebooks<Notebook>()')
  expect(appSource).toContain('setNotes(nextNotes)')
  expect(appSource).toContain('setNotebooks(ensureDefaultNotebook(nextNotebooks))')
})


test('notes overlay regression › notebook and editor panels stay above their backdrop', () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), 'src/App.css'), 'utf8')
  expect(css).toContain('.notes-overlay>.modal-backdrop,.note-editor-overlay>.modal-backdrop{z-index:0}')
  expect(css).toContain('.notebook-drawer{position:absolute;z-index:2')
  expect(css).toContain('.note-editor{position:absolute;z-index:2')
})

test('notes presentation regression › editor covers global search and markdown task lists have no extra bullet', () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), 'src/App.css'), 'utf8')
  expect(css).toContain('.notes-overlay,.note-editor-overlay{z-index:240}')
  expect(css).toContain('.zing-markdown .task-list-item{list-style:none}')
  expect(css).toContain('.zing-markdown .task-list-item::marker{content:""}')
})

test('notes presentation regression › active state is consistently Chinese and visually highlighted', () => {
  const notesPage = fs.readFileSync(path.resolve(process.cwd(), 'src/features/notes/NotesPage.tsx'), 'utf8')
  const css = fs.readFileSync(path.resolve(process.cwd(), 'src/App.css'), 'utf8')
  expect(notesPage).not.toContain('Active Notes')
  expect(notesPage).not.toContain('● Active')
  expect(notesPage).toContain('● 已激活')
  expect(notesPage).toContain('○ 激活')
  expect(css).toContain('.note-active-toggle.is-active')
  expect(css).toContain('box-shadow:0 0 0 3px')
})

test('notes markdown regression › emphasized text receives a visible synthesized slant', () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), 'src/App.css'), 'utf8')
  expect(css).toContain('.zing-markdown em{font-style:italic')
  expect(css).toContain('transform:skewX(-8deg)')
})

test('notes markdown regression › toolbar is grouped and exposes heading levels, strikethrough, table and checklist', () => {
  const editor = fs.readFileSync(path.resolve(process.cwd(), 'src/components/markdown/MarkdownEditorAdapter.tsx'), 'utf8')
  expect(editor).toContain('commands.group(')
  expect(editor).toContain('commands.title1')
  expect(editor).toContain('commands.title6')
  expect(editor).toContain('commands.strikethrough')
  expect(editor).toContain('commands.table')
  expect(editor).toContain('commands.checkedListCommand')
  expect(editor).toContain('commands.divider')
})


test('notes markdown regression › Chinese emphasis has visual breathing room', () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), 'src/App.css'), 'utf8')
  expect(css).toContain('margin-inline:.14em')
})


test('Notes editor owns checklist completion toggling while Preview stays read-only', async () => {
  const editor=fs.readFileSync(path.resolve(process.cwd(), 'src/components/markdown/MarkdownEditorAdapter.tsx'),'utf8')
  const renderer=fs.readFileSync(path.resolve(process.cwd(), 'src/components/markdown/MarkdownRenderer.tsx'),'utf8')
  expect(editor).toContain('toggleMarkdownTaskAtOffset(value, cursor)')
  expect(editor).toContain('切换当前清单完成状态')
  expect(editor).toContain('onMouseDown: (event: any) => event.preventDefault()')
  expect(editor).toContain('focus({ preventScroll: true })')
  expect(renderer).not.toContain('onChange')
})

test('Markdown preview gives GFM tables an explicit visible table treatment', async () => {
  const css=fs.readFileSync(path.resolve(process.cwd(), 'src/App.css'),'utf8')
  expect(css).toContain('.zing-markdown table{width:100%;border-collapse:collapse')
  expect(css).toContain('.zing-markdown th,.zing-markdown td{border:1px solid')
})

test('notes markdown regression › checklist toggle preserves viewport state and uses a toolbar-consistent icon', () => {
  const editor = fs.readFileSync(path.resolve(process.cwd(), 'src/components/markdown/MarkdownEditorAdapter.tsx'), 'utf8')
  const css = fs.readFileSync(path.resolve(process.cwd(), 'src/App.css'), 'utf8')
  expect(editor).toContain('const scrollSnapshots = root')
  expect(editor).toContain('.map(el => ({ el, top: el.scrollTop, left: el.scrollLeft }))')
  expect(editor).toContain('focus({ preventScroll: true })')
  expect(editor).toContain('snapshot.el.scrollTop = snapshot.top')
  expect(editor).toContain('className="zing-toggle-task-command"')
  expect(css).toContain('.zing-toggle-task-command{width:15px;height:15px')
})

test('notes markdown regression › preview quotes have a distinct visual treatment', () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), 'src/App.css'), 'utf8')
  expect(css).toContain('.zing-markdown blockquote{')
  expect(css).toContain('border-left:4px solid')
  expect(css).toContain('background:#f4f7f5')
})

test('notes desktop regression › editor adapter reports scroll progress and Notes applies it to preview', () => {
  const notesPage = fs.readFileSync(path.resolve(process.cwd(), 'src/features/notes/NotesPage.tsx'), 'utf8')
  const editor = fs.readFileSync(path.resolve(process.cwd(), 'src/components/markdown/MarkdownEditorAdapter.tsx'), 'utf8')
  expect(notesPage).toContain('onScrollRatio={syncPreviewScroll}')
  expect(notesPage).toContain('preview.scrollTop=max>0?ratio*max:0')
  expect(editor).toContain("root.addEventListener('scroll', report, { capture: true, passive: true })")
  expect(editor).toContain('const scroller = event.target as HTMLElement | null')
  expect(editor).toContain('if (max > 1) onScrollRatio(scroller.scrollTop / max)')
})

test('notes markdown browser regression › clean GFM table renders as a real table', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await page.locator('.bottom-nav').getByRole('button', { name: '笔记' }).click()
  await page.getByRole('button', { name: '＋ 新建' }).click()
  const editor = page.locator('.note-editor .zing-md-editor textarea')
  await editor.fill('| Header | Header |\n| --- | --- |\n| Cell | Cell |\n| Cell | Cell |')
  await expect(page.locator('.note-preview-pane table')).toBeVisible()
  await expect(page.locator('.note-preview-pane th')).toHaveCount(2)
  await expect(page.locator('.note-preview-pane td')).toHaveCount(4)
})


test('notes markdown browser regression › checklist toggle keeps the real UIW scroll container in place', async ({ page }) => {
  await page.goto('/')
  await page.locator('.bottom-nav').getByRole('button', { name: '笔记' }).click()
  await page.getByRole('button', { name: '＋ 新建' }).click()
  const textarea = page.locator('.note-editor .zing-md-editor textarea')
  const lines = Array.from({length: 80}, (_, i) => i === 45 ? '- [ ] target task' : `line ${i + 1}`).join('\n')
  await textarea.fill(lines)
  const offset = lines.indexOf('- [ ] target task') + 3
  await textarea.evaluate((el, pos) => { const t=el as HTMLTextAreaElement; t.focus(); t.setSelectionRange(pos,pos) }, offset)
  const scroller = page.locator('.note-editor .zing-md-editor .w-md-editor-content')
  await scroller.evaluate(el => { (el as HTMLElement).scrollTop = 600; el.dispatchEvent(new Event('scroll')) })
  const before = await scroller.evaluate(el => (el as HTMLElement).scrollTop)
  await page.getByRole('button', { name: '切换当前清单完成状态' }).click()
  await expect(textarea).toHaveValue(/- \[x\] target task/)
  await expect.poll(async () => {
    const after = await scroller.evaluate(el => (el as HTMLElement).scrollTop)
    return Math.abs(after - before)
  }).toBeLessThan(8)
})

test('notes desktop browser regression › the mounted UIW editor drives preview scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 850 })
  await page.goto('/')
  await page.locator('.bottom-nav').getByRole('button', { name: '笔记' }).click()
  await page.getByRole('button', { name: '＋ 新建' }).click()
  const textarea = page.locator('.note-editor .zing-md-editor textarea')
  await textarea.fill(Array.from({length: 180}, (_, i) => `## Section ${i + 1}\ncontent ${i + 1}`).join('\n\n'))
  const preview = page.locator('.note-editor .note-preview-pane')
  await expect.poll(() => preview.evaluate(el => (el as HTMLElement).scrollHeight - (el as HTMLElement).clientHeight)).toBeGreaterThan(0)
  const actualScroller = page.locator('.note-editor .zing-md-editor *')
  const index = await actualScroller.evaluateAll(nodes => nodes.findIndex(node => {
    const el = node as HTMLElement
    const style = getComputedStyle(el)
    return el.scrollHeight - el.clientHeight > 1 && ['auto','scroll'].includes(style.overflowY)
  }))
  expect(index).toBeGreaterThanOrEqual(0)
  const scroller = actualScroller.nth(index)
  await scroller.evaluate(el => { const h=el as HTMLElement; const max=h.scrollHeight-h.clientHeight; h.scrollTop=max*0.6; h.dispatchEvent(new Event('scroll')) })
  await expect.poll(() => preview.evaluate(el => (el as HTMLElement).scrollTop)).toBeGreaterThan(0)
})

test('notes trash integration regression › Notes joins unified Trash restore and permanent-delete lifecycle', () => {
  const notesPage = fs.readFileSync(path.resolve(process.cwd(), 'src/features/notes/NotesPage.tsx'), 'utf8')
  expect(notesPage).toContain('trashNote(row,now)')
  expect(notesPage).toContain('笔记将移入回收站')
  expect(appSource).toContain("entity:'note'")
  expect(appSource).toContain("setAutoSyncToast('✓ 已恢复笔记')")
  expect(appSource).toContain('permanentlyDeleteNote(current,item.note.id)')
  expect(appSource).toContain('purgeTrashedNotes(current)')
})

test('notes search and sync lifecycle regression › trashed Notes stay searchable-off while soft delete remains a sync upsert', () => {
  const searchSource = fs.readFileSync(path.resolve(process.cwd(), 'src/domain/search.ts'), 'utf8')
  expect(appSource).toContain('activeNotes: notes.filter(note=>!note.trashedAt)')
  expect(searchSource).toContain("if (searchFilter === 'all' || searchFilter === 'note')")
  expect(appSource).toContain("recordSyncDiff('note',previous,notes)")

  const liveNote = { id: 'note-1', title: 'Reference', content: 'keep me', updatedAt: 1 }
  const trashedNote = { ...liveNote, trashedAt: 2, updatedAt: 2 }
  expect(planSyncDiff('note', [liveNote], [trashedNote])).toEqual([
    { entityType: 'note', entityId: 'note-1', operation: 'upsert' },
  ])
})
