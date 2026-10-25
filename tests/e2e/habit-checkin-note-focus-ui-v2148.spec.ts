import { startV217, testHabit, openHabit, databaseCall } from '../helpers/v217Harness'
import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { readStylesheet } from '../helpers/applicationSource'

const notes = readFileSync('src/features/notes/NotesPage.tsx', 'utf8')

test('habit details add directly for selected day while existing entries retain date/quantity editor', async ({page}) => {
  await startV217(page,{habits:[testHabit('A')]})
  const detail=await openHabit(page,'A')
  await detail.getByRole('button',{name:'＋ 为所选日期补打卡',exact:true}).click()
  await expect(page.getByRole('dialog',{name:'补充打卡',exact:true})).toHaveCount(0)
  const selected=detail.getByRole('region',{name:'所选日期打卡记录'})
  await expect(selected).toContainText('2 次')
  await selected.getByRole('button',{name:'修改',exact:true}).click()
  const editor=page.getByRole('dialog',{name:'修改打卡记录',exact:true})
  await expect(editor.getByLabel('发生日期')).toHaveValue('2026-10-25')
  await editor.getByLabel('数量（次）').fill('3')
  await editor.getByRole('button',{name:'保存修改',exact:true}).click()
  await expect(editor).toBeHidden()
  await expect.poll(()=>databaseCall<any[]>(page,'return await db.loadHabitCheckIns()')).toMatchObject([{occurredDate:'2026-10-25',quantity:3}])
})

test('note focus controls use neutral button styling rather than link styling', () => {
  const shared = readFileSync('src/components/ui/FocusCard.tsx', 'utf8')
  const sharedCss = readStylesheet('src/styles/focus-card.css')
  expect(notes).toContain('<FocusCard className="note-focus-card"')
  expect(shared).toContain('className="ui-focus-card-history"')
  expect(sharedCss).toContain('.ui-focus-card .ui-focus-card-history')
  expect(sharedCss).toContain('background:#fff')
  expect(sharedCss).not.toContain('text-decoration:underline')
})
