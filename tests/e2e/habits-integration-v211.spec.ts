import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { readApplicationSource } from '../helpers/applicationSource'
const src=(name:string)=>fs.readFileSync(path.resolve(process.cwd(),'src',name),'utf8')
test('habits is in both navigation systems and daily detail before menstrual section',()=>{
 expect(src('features/navigation/DesktopNavigationDrawer.tsx')).toContain("'habits'")
 expect(src('features/navigation/navigationConfig.ts')).toContain("'habits'")
 const app=readApplicationSource()
 expect(app.indexOf('habit-daily-section')).toBeGreaterThan(app.indexOf('journal-section'))
 expect(app.indexOf('habit-daily-section')).toBeLessThan(app.indexOf('menstrual-section'))
})
test('habits and check-ins are first-class sync entities and backup entries',()=>{
 const db=src('db/calendar.ts'),app=readApplicationSource()
 for(const entity of ['habit','habitCheckIn'])expect(db).toContain(`'${entity}'`)
 expect(app).toContain("data/habits.json")
 expect(app).toContain("data/habit-checkins.json")
 expect(src('domain/backup.ts')).toContain("data/habit-checkins.json")
})
