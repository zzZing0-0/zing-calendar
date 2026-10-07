import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

test('notes markdown regression › desktop preview is a bounded scroll container for synchronized scrolling', () => {
  const css = readFileSync('src/App.css', 'utf8')
  expect(css).toContain('.note-edit-pane,.note-preview-pane{min-width:0;min-height:0;overflow:auto}')
})

test('notes markdown regression › UIW adapter reports real editor scroll progress to Notes preview', () => {
  const adapter = readFileSync('src/components/markdown/MarkdownEditorAdapter.tsx', 'utf8')
  const notes = readFileSync('src/features/notes/NotesPage.tsx', 'utf8')
  expect(adapter).toMatch(/root\.addEventListener\('scroll',\s*report,\s*\{\s*capture:\s*true,\s*passive:\s*true\s*\}\)/)
  expect(adapter).toMatch(/event\.target as HTMLElement\s*\|\s*null/)
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
  expect(adapter).toMatch(/buttonProps\?:\s*ButtonHTMLAttributes<HTMLButtonElement>\s*\|\s*null/)
  expect(adapter).toMatch(/\.\.\.\(command\.buttonProps\s*\?\?\s*\{\}\)/)
})


test('notes mobile architecture regression › mobile editing is independent of UIW viewport and scroll containers', () => {
  const adapter = readFileSync('src/components/markdown/MarkdownEditorAdapter.tsx','utf8')
  const notes = readFileSync('src/features/notes/NotesPage.tsx','utf8')
  const css = readFileSync('src/App.css','utf8')
  expect(adapter).toContain('if(isMobile)return <MobileMarkdownEditor')
  expect(adapter).toContain('data-mobile-single-layer="true"')
  expect(adapter).toContain('className="zing-mobile-md-textarea"')
  expect(adapter).toContain("pendingScroll.current={scroller,top:scroller?.scrollTop??0,pageX:window.scrollX,pageY:window.scrollY}")
  expect(adapter).not.toContain('onInput={resize}')
  expect(adapter).toContain('<MDEditor value={value}')
  expect(adapter).not.toContain('highlightEnable=')
  expect(notes).not.toContain('visualViewport')
  expect(notes).not.toContain('mobileNaturalHeight')
  expect(notes).not.toContain('keyboard-open')
  expect(css).toContain('.zing-mobile-md-toolbar-shell{position:-webkit-sticky;position:sticky;top:0')
  expect(css).toContain('.zing-mobile-md-textarea{display:block;box-sizing:border-box;width:100%;min-height:320px;height:auto;overflow:hidden;resize:none')
})

test('notes mobile layout regression › the headless toolbar is the only sticky editor control', () => {
  const css = readFileSync('src/App.css','utf8')
  const adapter = readFileSync('src/components/markdown/MarkdownEditorAdapter.tsx','utf8')
  expect(adapter).toContain('className="zing-mobile-md-toolbar"')
  expect(css).toContain('.zing-mobile-md-toolbar-shell{position:-webkit-sticky;position:sticky;top:0')
  expect(css).not.toContain('.zing-mobile-md-textarea{position:sticky')
})

test('notes mobile toolbar regression › headless toolbar keeps core Markdown commands and cursor checklist toggle', () => {
  const adapter = readFileSync('src/components/markdown/MarkdownEditorAdapter.tsx','utf8')
  expect(adapter).toContain("toggleMarkdownTaskAtOffset(value,sel.start)")
  expect(adapter).toContain("wrap('**')")
  expect(adapter).toContain("wrap('*')")
  expect(adapter).toContain("wrap('~~')")
  expect(adapter).toContain("prefix('- ')")
  expect(adapter).toContain("prefix('1. ')")
  expect(adapter).toContain("prefix('> ')")
  expect(adapter).toContain("'](https://)'")
  expect(adapter).toContain("'| 列 1 | 列 2 |\\n| --- | --- |\\n| 内容 | 内容 |\\n'")
  expect(adapter).toContain("wrap('```\\n','\\n```','代码')")
})

test('notes mobile toolbar scroll regression › toolbar commits snapshot scroll before changing markdown', () => {
  const adapter = readFileSync('src/components/markdown/MarkdownEditorAdapter.tsx', 'utf8')
  expect(adapter).toContain('const commit=(next:string,nextSelection:Selection)=>{snapshotScroll();pendingSelection.current=nextSelection;onChange(next)}')
  expect(adapter).toContain('el.setSelectionRange(sel.start,sel.end);if(pendingScroll.current){restoreScroll()')
})
