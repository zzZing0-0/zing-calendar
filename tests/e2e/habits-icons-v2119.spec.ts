import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import { readStylesheet } from '../helpers/applicationSource'

const picker = fs.readFileSync('src/features/habits/HabitIcons.tsx', 'utf8')
const styles = readStylesheet('src/features/habits/habits.css')

test('icon category navigation is horizontal at every viewport size', () => {
  expect(styles).toMatch(/\.habit-icon-browser-body\{display:grid;grid-template-columns:minmax\(0,1fr\)/)
  expect(styles).toMatch(/\.habit-icon-categories\{[^}]*display:flex;[^}]*flex-direction:row;[^}]*overflow-x:auto/)
  expect(styles).not.toContain('grid-template-columns:125px minmax(0,1fr)')
  expect(styles).not.toContain('.habit-icon-categories{display:flex;flex-direction:column')
})

test('category selection preserves paging and selected icon semantics', () => {
  expect(picker).toContain('setCategory(item.id); setPage(0)')
  expect(picker).toContain('aria-pressed={category === item.id}')
  expect(picker).toContain('aria-pressed={value===name}')
  expect(picker).toContain('const PAGE_SIZE = 24')
  expect(styles).toContain('grid-template-columns:repeat(4,minmax(0,1fr))')
})
