import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import { visibleOnDay } from '../../src/features/habits/habitDomain'
import type { Habit, HabitCheckIn } from '../../src/features/habits/habitDomain'

const archived: Habit = {id:'reading',name:'阅读',schedule:{kind:'flexible',period:'day',times:1},quantityTarget:1,unit:'次',createdAt:'2026-10-01T08:00:00Z',updatedAt:'2026-10-15T09:00:00Z',archivedAt:'2026-10-15T09:00:00Z'}
const recorded: HabitCheckIn = {id:'entry',habitId:'reading',occurredDate:'2026-10-12',quantity:1,createdAt:'2026-10-13T09:00:00Z',updatedAt:'2026-10-13T09:00:00Z'}

test('archived habits preserve historical daily check-ins, without future prompts',()=>{
 expect(visibleOnDay(archived,[recorded],'2026-10-12','2026-10-17')).toBe(true)
 expect(visibleOnDay(archived,[recorded],'2026-10-14','2026-10-17')).toBe(false)
 expect(visibleOnDay(archived,[recorded],'2026-10-17','2026-10-17')).toBe(false)
 expect(visibleOnDay(archived,[recorded],'2026-10-18','2026-10-17')).toBe(false)
})
test('archived habits have a dedicated manager and never mix with active goal groups',()=>{
 const source=fs.readFileSync('src/features/habits/HabitsPage.tsx','utf8')
 expect(source).toContain('管理归档习惯')
 expect(source).toContain('恢复习惯')
 expect(source).toContain('!h.archivedAt')
 expect(source).not.toContain('显示已归档')
})
