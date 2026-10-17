import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { progressForDate, mergeHabitCheckIns, visibleOnDay } from '../../src/features/habits/habitDomain'
import type { Habit, HabitCheckIn } from '../../src/features/habits/habitDomain'

const app = readFileSync('src/App.tsx','utf8')
const search = readFileSync('src/domain/search.ts','utf8')
const page = readFileSync('src/features/habits/HabitsPage.tsx','utf8')
const habit: Habit = {id:'h',name:'读书',schedule:{kind:'flexible',period:'day',times:3},quantityTarget:10,unit:'分钟',createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-01T00:00:00Z'}
const row = (id:string,quantity=10,updatedAt='2026-10-17T10:00:00Z',deletedAt?:string):HabitCheckIn=>({id,habitId:'h',occurredDate:'2026-10-17',quantity,createdAt:'2026-10-17T09:00:00Z',updatedAt,deletedAt})

test('daily target counts qualified distinct check-ins, not any check-in or quantity alone',()=>{
 expect(progressForDate(habit,[row('a',100)],'2026-10-17')).toMatchObject({done:1,target:3,met:false})
 expect(progressForDate(habit,[row('a'),row('b'),row('c')],'2026-10-17').met).toBe(true)
 expect(progressForDate(habit,[row('a'),row('b',3),row('c')],'2026-10-17').met).toBe(false)
 expect(progressForDate(habit,[row('a',10,'2026-10-17T10:00:00Z','2026-10-17T11:00:00Z')],'2026-10-17').done).toBe(0)
})
test('independent device check-ins merge, newer tombstone wins stale record',()=>{
 const merged=mergeHabitCheckIns([row('a')],[row('b')]);expect(merged.map(r=>r.id).sort()).toEqual(['a','b'])
 const cancelled=mergeHabitCheckIns([row('a')],[row('a',10,'2026-10-17T11:00:00Z','2026-10-17T11:00:00Z')]);expect(cancelled[0].deletedAt).toBeTruthy()
})
test('archive preserves logged history but stops new prompts',()=>{
 const archived={...habit,archivedAt:'2026-10-17T12:00:00Z'}
 expect(visibleOnDay(archived,[row('a')],'2026-10-17','2026-10-17')).toBe(true)
 expect(visibleOnDay(archived,[],'2026-10-17','2026-10-17')).toBe(false)
})
test('habit trash restore and purge are wired to unified trash, preserving history on restore',()=>{
 expect(app).toContain("entity:'habit'; habit:Habit")
 expect(app).toContain("deletedAt:undefined,updatedAt:now")
 expect(app).toContain('setHabitCheckIns(current=>current.filter(r=>r.habitId!==item.habit.id))')
 expect(app).toContain("['habit','习惯']")
})
test('habit search excludes deleted items, tag scopes and deletion clean up references',()=>{
 expect(search).toContain("searchFilter === 'habit'")
 expect(app).toContain('activeHabits: habits.filter(h=>!h.deletedAt)')
 expect(page).toContain("t.scope==='habit'")
 expect(app).toContain('tagId:undefined,updatedAt:now')
 expect(app).toContain("habitUsed && '习惯'")
})
