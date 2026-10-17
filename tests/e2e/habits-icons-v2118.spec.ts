import { test, expect } from '@playwright/test'
import fs from 'node:fs'

const picker = fs.readFileSync('src/features/habits/HabitIcons.tsx', 'utf8')
const styles = fs.readFileSync('src/features/habits/habits.css', 'utf8')

test('habit icon browser has Chinese categories and no required English search', () => {
  for (const category of ['运动健康', '学习工作', '生活家居', '自然动物', '娱乐艺术', '交通旅行']) expect(picker).toContain(category)
  expect(picker).toContain('aria-label="图标分类"')
  expect(picker).toContain('placeholder="可选：搜索图标名称"')
  expect(picker).not.toContain('选择 SVG 图标')
})
test('habit icon browser paginates 24 icons with reset on category/search changes', () => {
  expect(picker).toContain('const PAGE_SIZE = 24')
  expect(picker).toContain('results.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)')
  expect(picker).toContain('setCategory(item.id); setPage(0)')
  expect(picker).toContain('setSearch(e.target.value); setPage(0)')
  expect(picker).toContain('disabled={page === 0}')
  expect(picker).toContain('disabled={page >= pages - 1}')
})
test('icon picker has stable desktop width and horizontal category strip', () => {
  expect(styles).toContain('.habit-icon-browser{width:min(100%,520px)')
  expect(styles).toContain('grid-template-columns:repeat(4,minmax(0,1fr))')
  expect(styles).toContain('grid-template-rows:repeat(6,42px)')
  expect(styles).toContain('.habit-icon-categories{display:flex;flex-direction:row;')
})
