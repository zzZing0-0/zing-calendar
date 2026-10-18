import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { appendFocusSession, endFocusSession, editFinishedFocusSession } from '../../src/domain/focusSessionActions'
import type { FocusSession } from '../../src/types'

const app = readFileSync('src/App.tsx', 'utf8')
const sample: FocusSession = { id:'s', tagIds:['old'], mode:'stopwatch', startedAt:'2026-10-01T10:00:00.000Z', endedAt:null, durationSeconds:0, createdAt:'2026-10-01T10:00:00.000Z', updatedAt:'2026-10-01T10:00:00.000Z' }

test('all four focus flows use shared immutable append and end operations', () => {
  expect(app.match(/appendFocusSession\(current\s*,/g)?.length).toBe(4)
  expect(app.match(/setFocusSessions\(current\s*=>\s*endFocusSession\(current\s*,/g)?.length).toBe(4)
  const initial=[sample]
  expect(appendFocusSession(initial,{...sample,id:'s2'})).toHaveLength(2)
  expect(initial).toHaveLength(1)
  const ended=endFocusSession(initial,'s',Date.parse('2026-10-01T10:10:00Z'))
  expect(ended[0].endedAt).toBeTruthy()
  expect(endFocusSession(ended,'s',Date.parse('2026-10-01T10:20:00Z'))).toEqual(ended)
  expect(endFocusSession([{...sample,trashedAt:'2026-10-01T11:00:00Z'}],'s',Date.now())[0].endedAt).toBeNull()
})

test('finished edit rejects invalid intervals and preserves original context', () => {
  const finished={...sample,endedAt:'2026-10-01T10:10:00.000Z',context:{kind:'task' as const,taskId:'t1'}}
  const input={startedAt:'2026-10-01T10:00',endedAt:'2026-10-01T10:30',tagIds:['new'],maxFocusHours:24,updatedAt:'2026-10-02T00:00:00Z'}
  expect(editFinishedFocusSession(finished,{...input,endedAt:input.startedAt}).error).toBeTruthy()
  expect(editFinishedFocusSession(finished,{...input,maxFocusHours:0.1}).error).toBeTruthy()
  const result=editFinishedFocusSession(finished,input)
  expect(result.error).toBeNull()
  if(result.session) {
    expect(result.session.context).toEqual(finished.context)
    expect(result.session.tagIds).toEqual(['new'])
    expect(result.session.durationSeconds).toBe(1800)
  }
})
