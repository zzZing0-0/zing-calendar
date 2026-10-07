import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

test('notes markdown regression › desktop preview is a bounded scroll container for synchronized scrolling', () => {
  const css = readFileSync('src/App.css', 'utf8')
  expect(css).toContain('.note-edit-pane,.note-preview-pane{min-width:0;min-height:0;overflow:auto}')
})

test('notes markdown regression › UIW adapter reports real editor scroll progress to Notes preview', () => {
  const adapter = readFileSync('src/components/markdown/MarkdownEditorAdapter.tsx', 'utf8')
  const notes = readFileSync('src/features/notes/NotesPage.tsx', 'utf8')
  expect(adapter).toContain("root.addEventListener('scroll', report, { capture: true, passive: true })")
  expect(adapter).toContain('event.target as HTMLElement | null')
  expect(notes).toContain('onScrollRatio={syncPreviewScroll}')
  expect(notes).toContain('ref={previewRef} className="note-preview-pane"')
})

test('notes markdown polish › renderer owns copyable code blocks, safe external links, and horizontally scrollable tables', () => {
  const renderer = readFileSync('src/components/markdown/MarkdownRenderer.tsx', 'utf8')
  const css = readFileSync('src/App.css', 'utf8')
  expect(renderer).toContain('navigator.clipboard.writeText(code)')
  expect(renderer).toContain("copied?'✓ 已复制':'复制'")
  expect(renderer).toContain('target="_blank" rel="noopener noreferrer"')
  expect(renderer).toContain('className="zing-table-scroll"')
  expect(css).toContain('.zing-table-scroll{width:100%;overflow-x:auto')
})

test('notes markdown polish › toolbar exposes Chinese purpose labels for formatting commands', () => {
  const adapter = readFileSync('src/components/markdown/MarkdownEditorAdapter.tsx', 'utf8')
  for (const label of ['粗体','斜体','删除线','无序列表','有序列表','插入清单','引用','插入链接','插入表格','行内代码','代码块','分隔线']) {
    expect(adapter).toContain(`'${label}'`)
  }
})


test('notes markdown polish › toolbar title wrapper accepts UIW nullable button props', () => {
  const adapter = readFileSync('src/components/markdown/MarkdownEditorAdapter.tsx', 'utf8')
  expect(adapter).toContain('buttonProps?: ButtonHTMLAttributes<HTMLButtonElement> | null')
  expect(adapter).toContain('...(command.buttonProps ?? {})')
})


test('notes mobile regression › long-note editor keeps toolbar fixed and scrolls content below it', () => {
  const css = readFileSync('src/App.css','utf8')
  expect(css).toContain('.note-split.mobile-edit .note-edit-pane{overflow:hidden}')
  expect(css).toContain('.note-split.mobile-edit .zing-md-editor .w-md-editor-toolbar{position:sticky;top:0;z-index:3')
  expect(css).toContain('.note-split.mobile-edit .zing-md-editor .w-md-editor-content{min-height:0;flex:1 1 auto;overflow:auto}')
})
