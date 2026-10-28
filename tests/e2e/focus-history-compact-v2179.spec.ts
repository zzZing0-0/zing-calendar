import { expect, test } from '@playwright/test'
import { startV217, testHabit, databaseCall } from '../helpers/v217Harness'

test.use({ timezoneId: 'Asia/Shanghai' })
for (const width of [320, 375, 390, 430]) {
  for (const longTitle of [false, true]) {
    test(`day focus log keeps actions beside information at ${width}px (${longTitle ? 'long' : 'short'} titles)`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 844 })
      await startV217(page, { habits: [testHabit('compact-habit')] })
      const title = longTitle ? '影像诊断与英语学习非常长的记录标题'.repeat(5) : '英语'
      await databaseCall(page, `
        const startedAt='2026-10-25T09:00:00+08:00',endedAt='2026-10-25T09:36:00+08:00';
        const title=${JSON.stringify(title)};
        await db.saveTags([{id:'compact-tag',name:title,color:'#a4c052'}]);
        await db.saveTasks([{id:'compact-task',title,date:'2026-10-25',priority:0,allDay:true,status:'todo',tagIds:['compact-tag'],createdAt:startedAt,updatedAt:endedAt}]);
        await db.saveNotes([{id:'compact-note',notebookId:'default',title,content:'',active:true,tagIds:['compact-tag'],createdAt:startedAt,updatedAt:endedAt}]);
        await db.saveFocusSessions(['habit','task','note','direct'].map(kind=>({id:kind,tagIds:['compact-tag'],mode:'stopwatch',startedAt,endedAt,durationSeconds:2160,createdAt:startedAt,updatedAt:endedAt,...(kind==='direct'?{}:{context:kind==='task'?{kind,taskId:'compact-task'}:kind==='note'?{kind,noteId:'compact-note'}:{kind,habitId:'compact-habit'}})})));
      `)
      await page.reload()
      await page.locator('.continuous-calendar .day-cell.today').first().click()
      await page.locator('.day-focus-button').click()
      const history = page.getByRole('dialog', { name: '专注记录', exact: true })
      await expect(history.locator('.focus-history-item')).toHaveCount(4)
      await expect(history.locator('.focus-history-summary')).toContainText('2小时24分钟')
      for (const item of await history.locator('.focus-history-item').all()) {
        await item.scrollIntoViewIfNeeded()
        const bounds = await item.evaluate(el => {
          const rect = el.getBoundingClientRect()
          const main = el.querySelector('.focus-history-main')!.getBoundingClientRect()
          const actions = el.querySelector('.focus-history-actions')!.getBoundingClientRect()
          return { height:rect.height, scroll:el.scrollWidth, width:el.clientWidth, right:rect.right, viewport:innerWidth,
            mainRight:main.right, mainTop:main.top, mainBottom:main.bottom,
            actionsLeft:actions.left, actionsTop:actions.top, actionsBottom:actions.bottom,
            buttons:[...el.querySelectorAll('.focus-history-actions button')].map(button=>button.getBoundingClientRect().width) }
        })
        expect(bounds.actionsLeft).toBeGreaterThanOrEqual(bounds.mainRight)
        expect(bounds.actionsTop).toBeLessThan(bounds.mainBottom)
        expect(bounds.actionsBottom).toBeGreaterThan(bounds.mainTop)
        expect(bounds.height).toBeLessThanOrEqual(84)
        expect(bounds.scroll).toBeLessThanOrEqual(bounds.width + 1)
        expect(bounds.right).toBeLessThanOrEqual(bounds.viewport)
        for (const buttonWidth of bounds.buttons) expect(buttonWidth).toBeGreaterThanOrEqual(40)
      }
      if (width === 390) await history.screenshot({ path:testInfo.outputPath('compact-history.png') })
      // Buttons retain real actions after moving back beside the record information.
      const habit = history.locator('.focus-history-section').filter({ has:page.getByRole('heading',{name:'习惯',exact:false}) })
      await habit.getByRole('button',{name:'更改',exact:true}).click()
      await expect(habit.getByLabel('开始',{exact:true})).toBeVisible()
      await habit.getByRole('button',{name:'取消',exact:true}).click()
      page.once('dialog', dialog=>dialog.accept())
      await habit.getByRole('button',{name:'删除',exact:true}).click()
      await expect(history.locator('.focus-history-item')).toHaveCount(3)
      await expect(history.locator('.focus-history-summary')).toContainText('1小时48分钟')
    })
  }
}
