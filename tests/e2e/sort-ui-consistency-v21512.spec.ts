import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(new URL(`../../src/${path}`, import.meta.url), 'utf8')

test('all three layout/module sorting dialogs share a drag-only control and restore action', () => {
  const layout = read('features/layout/LayoutOrderEditor.tsx')
  const module = read('features/navigation/NavigationSettingsDialogs.tsx')
  for (const source of [layout, module]) {
    expect(source).toContain('<SortableList')
    expect(source).toContain('shared-sort-restore')
    expect(source).not.toMatch(/aria-label={`(?:上移|下移)/)
  }
})

test('shared sort handle supports long press, pointer drag and keyboard without arrow buttons', () => {
  const source = read('components/ui/SortableList.tsx')
  expect(source).toContain('setTimeout(')
  expect(source).toContain('setPointerCapture')
  expect(source).toContain('elementFromPoint')
  expect(source).toContain("event.key === 'ArrowUp'")
  expect(source).toContain("event.key === 'ArrowDown'")
  expect(source).toContain('⠿')
})

test('shared sorting presentation is loaded after feature styles', () => {
  expect(read('main.tsx')).toContain("import './styles/sorting.css'")
  expect(read('styles/sorting.css')).toContain('.shared-sort-restore')
  expect(read('styles/sorting.css')).toContain('.mobile-nav-panel .mobile-nav-restore-action')
})
