import { expect, test } from '@playwright/test'
import { readApplicationSource, readStylesheet } from '../helpers/applicationSource'

const css = readStylesheet('src/features/habits/habits.css')
const app = readApplicationSource()

test('mobile habits cards and action controls use compact two-column layout', () => {
  expect(css).toContain('v2.11.17')
  expect(css).toMatch(/\.habit-card\{display:grid;grid-template-columns:minmax\(0,1fr\) auto/)
  expect(css).toContain('.habit-card-actions{align-self:center')
})

test('check-in dialog has bounded mobile height and compact editor', () => {
  expect(css).toContain('max-height:min(85dvh,760px)')
  expect(css).toContain('.habit-log-editor>button{background:var(--color-accent)')
})

test('daily details reuse mobile habits action palette and responsive row', () => {
  expect(app).toContain('habit-daily-section')
  expect(css).toContain('.habit-daily-section .habit-daily-row{display:grid')
  expect(css).toContain('color:var(--color-accent)')
})
