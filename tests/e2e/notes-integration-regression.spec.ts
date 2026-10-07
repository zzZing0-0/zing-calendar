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
  expect(editor).toMatch(/toggleMarkdownTaskAtOffset\(value,\s*(?:cursor|sel\.start)\)/)
  expect(editor).toContain('切换当前清单完成状态')
  expect(editor).toContain('toggleTask=')
  expect(editor).toMatch(/onMouseDown:\s*\(event:\s*any\)\s*=>\s*event\.preventDefault\(\)/)
  expect(editor).toMatch(/focus\(\{\s*preventScroll:\s*true\s*\}\)/)
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
  expect(editor).toMatch(/const scrollSnapshots\s*=\s*root/)
  expect(editor).toMatch(/\.map\(el\s*=>\s*\(\{\s*el,\s*top:\s*el\.scrollTop,\s*left:\s*el\.scrollLeft\s*\}\)\)/)
  expect(editor).toMatch(/focus\(\{\s*preventScroll:\s*true\s*\}\)/)
  expect(editor).toMatch(/snapshot\.el\.scrollTop\s*=\s*snapshot\.top/)
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
  expect(editor).toMatch(/root\.addEventListener\('scroll',\s*report,\s*\{\s*capture:\s*true,\s*passive:\s*true\s*\}\)/)
  expect(editor).toMatch(/const scroller\s*=\s*event\.target as HTMLElement\s*\|\s*null/)
  expect(editor).toMatch(/if\s*\(max\s*>\s*1\)\s*onScrollRatio\(scroller\.scrollTop\s*\/\s*max\)/)
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


test('notes markdown browser regression › desktop checklist toggle keeps the real UIW scroll container in place', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
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

test('notes mobile browser regression › single-layer checklist toggle edits the cursor line without UIW', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('.bottom-nav').getByRole('button', { name: '笔记' }).click()
  await page.getByRole('button', { name: '＋ 新建' }).click()
  const textarea = page.locator('.note-editor .zing-mobile-md-textarea')
  const source = ['- [ ] duplicate', 'middle', '- [ ] duplicate'].join('\n')
  await textarea.fill(source)
  const offset = source.lastIndexOf('- [ ] duplicate') + 3
  await textarea.evaluate((el, pos) => { const t=el as HTMLTextAreaElement; t.focus(); t.setSelectionRange(pos,pos) }, offset)
  await page.getByRole('button', { name: '插入/切换清单' }).click()
  await expect(textarea).toHaveValue('- [ ] duplicate\nmiddle\n- [x] duplicate')
  await expect(page.locator('.note-editor .w-md-editor')).toHaveCount(0)
})

test('notes mobile browser regression › typing in a long single-layer note preserves outer scroll position', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('.bottom-nav').getByRole('button', { name: '笔记' }).click()
  await page.getByRole('button', { name: '＋ 新建' }).click()
  const textarea = page.locator('.note-editor .zing-mobile-md-textarea')
  const source = Array.from({length: 100}, (_, i) => `line ${i + 1} long mobile note content`).join('\n\n')
  await textarea.fill(source)
  const editor = page.locator('.note-editor')
  await editor.evaluate(el => { (el as HTMLElement).scrollTop = 1200 })
  const before = await editor.evaluate(el => (el as HTMLElement).scrollTop)
  expect(before).toBeGreaterThan(500)
  const offset = source.indexOf('line 70') + 'line 70'.length
  await textarea.evaluate((el, pos) => { const t=el as HTMLTextAreaElement; t.focus({preventScroll:true}); t.setSelectionRange(pos,pos) }, offset)
  await textarea.press('d')
  await expect(textarea).toHaveValue(source.slice(0,offset) + 'd' + source.slice(offset))
  await expect.poll(async () => Math.abs((await editor.evaluate(el => (el as HTMLElement).scrollTop)) - before)).toBeLessThan(8)
})

test('notes mobile browser regression › sticky toolbar stays pinned while long-note typing preserves scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('.bottom-nav').getByRole('button', { name: '笔记' }).click()
  await page.getByRole('button', { name: '＋ 新建' }).click()
  const textarea = page.locator('.note-editor .zing-mobile-md-textarea')
  const source = Array.from({length: 120}, (_, i) => `line ${i + 1} sticky toolbar content`).join('\n\n')
  await textarea.fill(source)
  const editor = page.locator('.note-editor')
  const toolbar = page.locator('.note-editor .zing-mobile-md-toolbar-shell')
  await editor.evaluate(el => { (el as HTMLElement).scrollTop = 900 })
  await expect.poll(() => editor.evaluate(el => (el as HTMLElement).scrollTop)).toBeGreaterThan(500)
  const pinnedY = await toolbar.evaluate(el => el.getBoundingClientRect().top)
  await editor.evaluate(el => { (el as HTMLElement).scrollTop += 500 })
  await expect.poll(async () => Math.abs((await toolbar.evaluate(el => el.getBoundingClientRect().top)) - pinnedY)).toBeLessThan(2)
  const beforeTyping = await editor.evaluate(el => (el as HTMLElement).scrollTop)
  const offset = source.indexOf('line 90') + 'line 90'.length
  await textarea.evaluate((el, pos) => { const t=el as HTMLTextAreaElement; t.focus({preventScroll:true}); t.setSelectionRange(pos,pos) }, offset)
  await textarea.press('d')
  await expect.poll(async () => Math.abs((await editor.evaluate(el => (el as HTMLElement).scrollTop)) - beforeTyping)).toBeLessThan(8)
  await expect.poll(async () => Math.abs((await toolbar.evaluate(el => el.getBoundingClientRect().top)) - pinnedY)).toBeLessThan(2)
})

test('notes mobile browser regression › toolbar command preserves edit position and sticky toolbar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('.bottom-nav').getByRole('button', { name: '笔记' }).click()
  await page.getByRole('button', { name: '＋ 新建' }).click()
  const textarea = page.locator('.note-editor .zing-mobile-md-textarea')
  const source = Array.from({length: 120}, (_, i) => `line ${i + 1} toolbar command content`).join('\n\n')
  await textarea.fill(source)
  const editor = page.locator('.note-editor')
  const toolbar = page.locator('.note-editor .zing-mobile-md-toolbar-shell')
  await editor.evaluate(el => { (el as HTMLElement).scrollTop = 1200 })
  await expect.poll(() => editor.evaluate(el => (el as HTMLElement).scrollTop)).toBeGreaterThan(500)
  const pinnedY = await toolbar.evaluate(el => el.getBoundingClientRect().top)
  const before = await editor.evaluate(el => (el as HTMLElement).scrollTop)
  const target = 'line 90'
  const start = source.indexOf(target)
  await textarea.evaluate((el, range) => { const t=el as HTMLTextAreaElement; t.focus({preventScroll:true}); t.setSelectionRange(range.start,range.end) }, {start,end:start+target.length})
  await page.getByTitle('粗体').click()
  await expect(textarea).toHaveValue(source.slice(0,start) + `**${target}**` + source.slice(start+target.length))
  await expect.poll(async () => Math.abs((await editor.evaluate(el => (el as HTMLElement).scrollTop)) - before)).toBeLessThan(8)
  await expect.poll(async () => Math.abs((await toolbar.evaluate(el => el.getBoundingClientRect().top)) - pinnedY)).toBeLessThan(2)
  const selection = await textarea.evaluate(el => ({start:(el as HTMLTextAreaElement).selectionStart,end:(el as HTMLTextAreaElement).selectionEnd}))
  expect(selection).toEqual({start:start+2,end:start+2+target.length})
})


test('notes mobile touch regression › pointer-down on a toolbar button keeps textarea focused and position pinned', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('.bottom-nav').getByRole('button', { name: '笔记' }).click()
  await page.getByRole('button', { name: '＋ 新建' }).click()
  const textarea = page.locator('.note-editor .zing-mobile-md-textarea')
  const source = Array.from({length: 120}, (_, i) => `line ${i + 1} touch toolbar content`).join('\n\n')
  await textarea.fill(source)
  const editor = page.locator('.note-editor')
  const toolbar = page.locator('.note-editor .zing-mobile-md-toolbar-shell')
  await editor.evaluate(el => { (el as HTMLElement).scrollTop = 1200 })
  await expect.poll(() => editor.evaluate(el => (el as HTMLElement).scrollTop)).toBeGreaterThan(500)
  const before = await editor.evaluate(el => (el as HTMLElement).scrollTop)
  const pinnedY = await toolbar.evaluate(el => el.getBoundingClientRect().top)
  const target = 'line 90'
  const start = source.indexOf(target)
  await textarea.evaluate((el, range) => { const t=el as HTMLTextAreaElement; t.focus({preventScroll:true}); t.setSelectionRange(range.start,range.end) }, {start,end:start+target.length})
  await expect(textarea).toBeFocused()
  const bold = page.getByTitle('粗体')
  await bold.dispatchEvent('pointerdown', { pointerType: 'touch', isPrimary: true, button: 0 })
  await expect(textarea).toBeFocused()
  await expect.poll(async () => Math.abs((await editor.evaluate(el => (el as HTMLElement).scrollTop)) - before)).toBeLessThan(8)
  await expect.poll(async () => Math.abs((await toolbar.evaluate(el => el.getBoundingClientRect().top)) - pinnedY)).toBeLessThan(2)
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

test('notes attachments integration › Notes UI supports device images and one audio recording through shared blob storage', () => {
  const notesPage=fs.readFileSync(path.resolve(process.cwd(),'src/features/notes/NotesPage.tsx'),'utf8')
  expect(notesPage).toContain('图片 · 最多 9 张')
  expect(notesPage).toContain('录音 · 最多 1 条 / 30 分钟')
  expect(notesPage).toContain("navigator.mediaDevices.getUserMedia({audio:true})")
  expect(notesPage).toContain('await putAttachmentBlob(storageKey,blob)')
  expect(notesPage).toContain('attachmentLinkTombstones:tombstones')
  expect(appSource).toContain('const addNoteImages = async (noteId: string, files: FileList | null)')
  expect(appSource).toContain('await putAttachmentBlob(storageKey, blob)')
})

test('notes attachments integration › Notes remain inside shared attachment lifecycle, backup, sync and B2 GC reference enumeration', () => {
  const attachments=fs.readFileSync(path.resolve(process.cwd(),'src/domain/attachments.ts'),'utf8')
  expect(attachments).toContain("for (const note of notes) add(note.attachments, note.trashedAt ? 'trash' : 'active')")
  expect(appSource).toContain('buildAttachmentLifecycle(tasks, journalEntries, notes)')
  expect(appSource).toContain('referencedAttachmentKeys(tasks, journalEntries, notes)')
  expect(appSource).toContain('const allStoredAttachments = useMemo(() => attachmentLifecycle.map(row => row.attachment)')
})


test('notes image library integration › Notes can reuse an existing library image without duplicating binary storage', () => {
  const notesPage=fs.readFileSync(path.resolve(process.cwd(),'src/features/notes/NotesPage.tsx'),'utf8')
  const notesDomain=fs.readFileSync(path.resolve(process.cwd(),'src/domain/notes.ts'),'utf8')
  expect(notesPage).toContain('▧ 从图片库选择')
  expect(notesPage).toContain('onOpenImageLibrary(editing.id)')
  expect(appSource).toContain("useState<'task'|'journal'|'note'|null>(null)")
  expect(appSource).toContain("setImageLibraryTarget('note')")
  expect(appSource).toContain('linkImageAttachmentToNote(current, imageLibraryNoteId, source, now, linked.id)')
  expect(notesDomain).toContain('storageKey === source.storageKey')
  expect(notesDomain).toContain("attachments.filter(item => item.type === 'image').length >= 9")
})


test('notes tags integration regression › Notes receives shared tag state and exposes color-sorted filter plus multi-select editor', () => {
  const app = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8')
  const notesPage = fs.readFileSync(path.resolve(process.cwd(), 'src/features/notes/NotesPage.tsx'), 'utf8')
  expect(app).toContain('<NotesPage notes={notes} notebooks={notebooks} tags={tags}')
  expect(notesPage).toContain('noteSelectableTags(tags)')
  expect(notesPage).toContain('toggleNoteTagIds(editing.tagIds,tagId)')
  expect(notesPage).toContain('className="notes-tag-filter"')
  expect(notesPage).toContain("current===tag.id?null:tag.id")
})


test('notes tags integration regression › deleting a tag removes Note references without inventing a default Note tag', () => {
  const app = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8')
  const tagsDomain = fs.readFileSync(path.resolve(process.cwd(), 'src/domain/tags.ts'), 'utf8')
  expect(app).toContain('const noteCount = notes.filter')
  expect(app).toContain('tagIds:cleanupNoteTagIdsAfterDelete(note.tagIds,id)')
  expect(tagsDomain).toContain("return (ids ?? []).filter(tagId => tagId !== deletedId)")
})


test('notes tags desktop regression › overflowing tag pills can scroll horizontally with a normal mouse wheel', () => {
  const notesPage = fs.readFileSync(path.resolve(process.cwd(), 'src/features/notes/NotesPage.tsx'), 'utf8')
  const css = fs.readFileSync(path.resolve(process.cwd(), 'src/App.css'), 'utf8')
  expect(notesPage).toContain('onWheel={scrollTagFilter}')
  expect(notesPage).toContain('row.scrollWidth<=row.clientWidth')
  expect(notesPage).toContain('row.scrollLeft+=delta')
  expect(notesPage).toContain('event.preventDefault()')
  expect(css).toContain('.notes-tag-filter{display:flex;gap:7px;overflow-x:auto')
})


test('notes card regression › active cards use a dot, show at most three tags before metadata, and drag instead of arrows', () => {
  const page = fs.readFileSync(path.resolve(process.cwd(), 'src/features/notes/NotesPage.tsx'), 'utf8')
  expect(page).toContain('className="note-active-dot"')
  expect(page).toContain('visibleTags.slice(0,3)')
  expect(page).toContain('visibleTags.length>3')
  expect(page).toContain('className="note-row-meta"')
  expect(page).toContain('draggable={!selectedNotebook&&!selectedTagId}')
  expect(page).toContain('dropActiveNote(n.id)')
  expect(page).not.toContain('>↑</button>')
  expect(page).not.toContain('>↓</button>')
  expect(page).not.toContain("n.active?'● 已激活':'○ 激活'")
})


test('notes card regression › metadata separates tags left from notebook/date right and uses global date formatting', () => {
  const page = fs.readFileSync(path.resolve(process.cwd(), 'src/features/notes/NotesPage.tsx'), 'utf8')
  expect(page).toContain('className="note-row-meta-tags"')
  expect(page).toContain("formatUiDate(new Date(n.updatedAt))")
  expect(page).not.toContain("new Date(n.updatedAt).toLocaleDateString()")
})

test('notes editor regression › desktop tag selector scrolls horizontally while editor active control stays textual', () => {
  const page = fs.readFileSync(path.resolve(process.cwd(), 'src/features/notes/NotesPage.tsx'), 'utf8')
  const css = fs.readFileSync(path.resolve(process.cwd(), 'src/App.css'), 'utf8')
  expect(page).toContain('className="note-tag-editor-scroll" onWheel={scrollTagFilter}')
  expect(css).toContain('.note-tag-editor-scroll')
  expect(css).toContain('overflow-x:auto')
  expect(page).toContain("editing.active?'● 已激活':'○ 激活'")
})

test('notes editor regression › editor timestamp uses the shared UI date formatter', () => {
  const page = fs.readFileSync(path.resolve(process.cwd(), 'src/features/notes/NotesPage.tsx'), 'utf8')
  expect(page).toContain("formatUiDate(new Date(editing.updatedAt))")
  expect(page).not.toContain("new Date(editing.updatedAt).toLocaleString()")
})


test('notes integration regression › shared UI date formatter is declared and destructured by NotesPage', () => {
  const app = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8')
  const page = fs.readFileSync(path.resolve(process.cwd(), 'src/features/notes/NotesPage.tsx'), 'utf8')
  expect(app).toContain('formatUiDate={formatUiDate}')
  expect(page).toContain('formatUiDate:(date:Date)=>string')
  expect(page).toContain('onPreviewImage,formatUiDate}:Props)')
  expect(page).toContain('formatUiDate(new Date(n.updatedAt))')
})
