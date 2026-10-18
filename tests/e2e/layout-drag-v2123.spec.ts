import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

const layout = readFileSync('src/features/layout/LayoutOrderEditor.tsx', 'utf8')
const shared = readFileSync('src/components/ui/SortableList.tsx', 'utf8')
const styles = readFileSync('src/styles/sorting.css', 'utf8')

test('both layout editors use the shared pointer-based reorder control', () => {
  expect(layout).toContain('<SortableList')
  for (const required of ['onPointerDown', 'onPointerMove', 'onPointerUp', 'onPointerCancel', 'setPointerCapture', 'elementFromPoint', 'data-sort-index']) {
    expect(shared).toContain(required)
  }
  expect(styles).toContain('.shared-sort-handle')
})

test('day detail keeps task fixed in the first position', () => {
  expect(layout).toContain("kind==='day'&&<div className=\"shared-sort-fixed\">任务")
  expect(layout).toContain('固定首位')
  expect(layout).toContain('<SortableList items={order}')
})

test('movable rows use a six-dot drag handle and keyboard arrows without visible move buttons', () => {
  expect(shared).toContain('⠿')
  expect(shared).toContain("event.key === 'ArrowUp'")
  expect(shared).toContain("event.key === 'ArrowDown'")
  expect(shared).not.toContain('上移${')
  expect(shared).not.toContain('下移${')
  expect(layout).toContain('恢复默认')
})
