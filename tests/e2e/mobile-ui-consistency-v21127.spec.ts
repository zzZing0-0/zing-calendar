import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.tsx', 'utf8')
const appCss = readFileSync('src/App.css', 'utf8')
const habits = readFileSync('src/features/habits/HabitsPage.tsx', 'utf8')
const habitsCss = readFileSync('src/features/habits/habits.css', 'utf8')

test('mobile search moves to Settings while desktop search remains', () => {
  expect(app).toContain('settings-mobile-search-entry')
  expect(app).toContain('setMobileSearchVisible(true)')
  expect(app).toContain('global-search-wrap')
  expect(appCss).toContain('.topbar .brand-block,.topbar .brand-mark{display:none!important}')
  expect(appCss).toContain('.topbar .global-search-wrap.mobile-open')
})

test('hidden pages precede navigation settings and use shared SVG icons', () => {
  const section = app.slice(app.indexOf('settings-group mobile-nav-settings-group'))
  expect(section).toContain('missingMobileNav(mobileNav).map')
  expect(app).toContain("setMobileNavSettingsOpen(true)")
  expect(section).toContain('mobileNavIcon(page)')
})

test('habit tag chip uses actual tag color, not duplicated plain text', () => {
  expect(habits).toContain('className="habit-card-tag"')
  expect(habits).toContain('background:tags.find(t=>t.id===h.tagId)?.color')
  expect(habitsCss).toContain('.habit-card-tag i')
})

test('habit and note headers have matching mobile alignment', () => {
  expect(habitsCss).toContain('.habits-header,.notes-heading{min-height:76px;align-items:center!important}')
})
