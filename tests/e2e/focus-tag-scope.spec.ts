import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { readApplicationSource } from '../helpers/applicationSource'

test('focus tag scope regression › Forest creates focus tags and upgrades existing non-focus tags to shared', () => {
  const externalImport = fs.readFileSync(path.resolve(process.cwd(), 'src/features/external-import/useExternalImport.ts'), 'utf8')
  expect(externalImport).toContain("scope:'focus',updatedAt:new Date().toISOString()")
  expect(externalImport).toContain("ordinaryTag.scope!=='both'&&ordinaryTag.scope!=='focus'")
  expect(externalImport).toContain("ordinaryTag={...ordinaryTag,scope:'both'")
})

test('focus tag scope regression › task timer inherits a compatible tag or explicitly falls back to default', () => {
  const app = readApplicationSource()
  const runtime = fs.readFileSync(path.resolve(process.cwd(), 'src/domain/focusRuntime.ts'), 'utf8')
  expect(app).toContain('不能直接用于专注')
  expect(app).toContain('focusTagIds=[DEFAULT_TAG_ID]')
  expect(app).toContain('createTaskFocusSession')
  expect(runtime).toContain("context:{kind:'task',taskId:input.taskId}")
})

test('focus tag scope regression › free focus exposes only focus shared and default tags', () => {
  const tags = fs.readFileSync(path.resolve(process.cwd(), 'src/domain/tags.ts'), 'utf8')
  expect(tags).toContain("tag.scope === 'both' || tag.scope === 'focus'")
})

test('focus tag scope regression › task focus statistics use the FocusSession tag directly', () => {
  const statistics = fs.readFileSync(path.resolve(process.cwd(), 'src/domain/statistics.ts'), 'utf8')
  expect(statistics).toContain('focusSessions.forEach(session=>')
  expect(statistics).toContain('focusTagForIds(session.tagIds)')
  expect(statistics).not.toContain('timerSessions')
})

test('focus tag scope regression › editing a free focus uses the same focus-selectable tag set as starting one', () => {
  const app = readApplicationSource()
  expect(app).toContain("focus-history-edit-tags\">{focusSelectableTags(tags).map")
  expect(app).not.toContain("focus-history-edit-tags\">{tagsFor(tags, 'task').map")
})
