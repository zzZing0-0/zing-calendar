import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import { readApplicationSource, readStylesheet } from '../helpers/applicationSource'

const page = fs.readFileSync('src/features/habits/HabitsPage.tsx', 'utf8')
const icons = fs.readFileSync('src/features/habits/HabitIcons.tsx', 'utf8')
const styles = readStylesheet('src/features/habits/habits.css')
const app = readApplicationSource()

test('habits use searchable Lucide SVG icons in editor, list and daily details', () => {
  expect(icons).toContain("from 'lucide-react'")
  expect(icons).toContain('搜索习惯图标')
  expect(icons).toContain('aria-pressed={value===name}')
  expect(page).toContain('<HabitIconPicker')
  expect(page).toContain('<HabitIcon name={h.icon}')
  expect(app).toContain('<HabitIcon name={habit.icon}')
  expect(page).not.toContain("['🌱','📖','💃'")
})

test('archived group shares the same grid spacing as completed and pending groups', () => {
  expect(page).toContain('<div className="habits-groups">')
  const start = page.indexOf('archivedWithHistory.length>0&&<section')
  const end = page.indexOf('{managingArchived&&', start)
  expect(start).toBeGreaterThan(0)
  expect(page.slice(start, end)).toContain('</div>')
  expect(styles).toContain('.habits-groups{display:grid;gap:32px}')
})
