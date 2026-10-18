import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { readApplicationSource, readStylesheet } from '../helpers/applicationSource'

const app = readApplicationSource()
const css = readStylesheet('src/App.css')
const types = fs.readFileSync(path.resolve('src/types.ts'), 'utf8')
const wakeLockHook = fs.readFileSync(path.resolve('src/hooks/useFocusWakeLock.ts'), 'utf8')

test('focus wake lock is opt-in and only follows a running task timer or direct focus', () => {
  expect(types).toContain('keepScreenAwakeDuringFocus?: boolean')
  expect(app).toContain("localStorage.getItem('zing:keepScreenAwakeDuringFocus') === 'true'")
  expect(app).toContain('useFocusWakeLock(keepScreenAwakeDuringFocus && Boolean(activeFocusSession))')
  expect(wakeLockHook).toContain("wakeLock.request('screen')")
  expect(wakeLockHook).toContain("document.addEventListener('visibilitychange', onVisibilityChange)")
  expect(wakeLockHook).toContain('void releaseWakeLock()')
  expect(app).toContain('专注时保持屏幕常亮')
})

test('wake-lock setting keeps checkbox before text in one compact row on mobile', () => {
  expect(app).toContain('<Field className="setting-row focus-wake-lock-setting">\n              <input type="checkbox"')
  expect(app).toContain('<span><strong>专注时保持屏幕常亮</strong>')
  expect(css).toContain('.focus-wake-lock-setting {\n  flex-direction: row;')
  expect(css).toContain('justify-content: flex-start;')
})

test('task title no longer reserves postpone badge width when no badge exists', () => {
  expect(css).toContain(`.task-title-input-wrap input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}`)
  expect(css).toContain(`.task-title-input-wrap:has(.postpone-count) input {
  padding-right: 112px;
}`)
})

test('mobile-facing form controls keep their usable width inside narrow dialogs', () => {
  expect(css).toContain('.field textarea,')
  expect(css).toContain('.encouragement-add textarea,')
  expect(css).toContain('min-width: 0;')
  expect(css).toContain('max-width: 100%;')
  expect(css).toContain('box-sizing: border-box;')
  expect(css).toContain('overflow-wrap: anywhere;')
})
