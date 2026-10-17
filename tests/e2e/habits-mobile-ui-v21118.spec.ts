import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

const habitsCss = readFileSync('src/features/habits/habits.css', 'utf8')
const navCss = readFileSync('src/features/navigation/navigation.css', 'utf8')
const nav = readFileSync('src/features/navigation/MobileNavigationSettings.tsx', 'utf8')
const app = readFileSync('src/App.tsx', 'utf8')

test('iOS date and quantity inputs are constrained by the modal grid', () => {
  expect(habitsCss).toContain('.habit-log-editor input[type="date"]')
  expect(habitsCss).toContain('min-inline-size:0')
  expect(habitsCss).toContain('.habit-log-editor{grid-template-columns:minmax(0,1fr)}')
  expect(habitsCss).toContain('max-width:100%;box-sizing:border-box')
})

test('habit names and controls use the existing green palette instead of link blue', () => {
  expect(habitsCss).toContain('.habit-card-main:visited')
  expect(habitsCss).toContain('color:#30463a')
  expect(habitsCss).toContain('color:#3c7058')
  expect(navCss).toContain('.mobile-nav-panel header button{color:#536b5b}')
  expect(app).toContain("const APP_VERSION = '2.11.18'")
})

test('navigation editor has drag handles but no arrow or show/hide action buttons', () => {
  expect(nav).toContain('onPointerDown={event => startPointer(event, id)}')
  expect(nav).not.toContain('mobile-nav-row-actions')
  expect(nav).not.toContain('上移`')
  expect(nav).not.toContain('下移`')
  expect(nav).toContain('onLostPointerCapture={cancel}')
})
