import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

test('focus tag scope regression › Forest creates focus tags and upgrades existing non-focus tags to shared', () => {
  const app = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8')
  expect(app).toContain("scope:'focus',updatedAt:new Date().toISOString()")
  expect(app).toContain("ordinaryTag.scope!=='both'&&ordinaryTag.scope!=='focus'")
  expect(app).toContain("ordinaryTag={...ordinaryTag,scope:'both'")
})

test('focus tag scope regression › task timer inherits a compatible tag or explicitly falls back to default', () => {
  const app = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8')
  expect(app).toContain('不能直接用于专注')
  expect(app).toContain('focusTagIds=[DEFAULT_TAG_ID]')
  expect(app).toContain('activeTimerFocusTagIds: focusTagIds')
  expect(app).toContain('focusTagIds: current.activeTimerFocusTagIds ?? task.activeTimerFocusTagIds ?? [DEFAULT_TAG_ID]')
})

test('focus tag scope regression › free focus exposes only focus shared and default tags', () => {
  const tags = fs.readFileSync(path.resolve(process.cwd(), 'src/domain/tags.ts'), 'utf8')
  expect(tags).toContain("tag.scope === 'both' || tag.scope === 'focus'")
})

test('focus tag scope regression › task timer statistics honor per-session focus attribution', () => {
  const statistics = fs.readFileSync(path.resolve(process.cwd(), 'src/domain/statistics.ts'), 'utf8')
  expect(statistics).toContain('session.focusTagIds?.length?session.focusTagIds:fallbackIds')
  expect(statistics).toContain('value*(row.raw/rawTotal)')
})
