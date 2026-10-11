import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import type { FocusSession, Task } from '../../src/types'
import { focusHistoryForDate, taskFocusSeconds } from '../../src/domain/focus'

const task: Task = { id:'task-a',title:'写报告',date:'2026-10-11',priority:1,status:'todo',allDay:true,createdAt:'2026-10-11T00:00:00Z',updatedAt:'2026-10-11T00:00:00Z' }
const session=(id:string,start:string,end:string):FocusSession=>({id,tagIds:['default'],mode:'stopwatch',startedAt:start,endedAt:end,durationSeconds:(new Date(end).getTime()-new Date(start).getTime())/1000,createdAt:start,updatedAt:end,context:{kind:'task',taskId:'task-a'}})

test('task time is derived only from task-context FocusSessions',()=>{
  const rows=[session('a','2026-10-11T08:00:00Z','2026-10-11T08:20:00Z'),session('b','2026-10-11T09:00:00Z','2026-10-11T09:30:00Z')]
  expect(taskFocusSeconds('task-a',rows,new Date('2026-10-11T10:00:00Z').getTime())).toBe(3000)
  expect(focusHistoryForDate([task],rows,'2026-10-11',new Date('2026-10-11T10:00:00Z').getTime())).toMatchObject([{kind:'task',title:'写报告',seconds:3000}])
})

test('recurring tasks expose no timer path and legacy task timer fields are gone',()=>{
  const app=fs.readFileSync(path.resolve('src/App.tsx'),'utf8')
  const types=fs.readFileSync(path.resolve('src/types.ts'),'utf8')
  expect(app).toContain("viewingTask.status === 'todo' && !viewingTask.recurrence && !viewingTask.seriesId")
  for(const legacy of ['actualDurationMinutes','timerSessions','timerSecondsRemainder','activeTimerStartedAt','activeTimerFocusTagIds']) expect(types).not.toContain(legacy)
})
