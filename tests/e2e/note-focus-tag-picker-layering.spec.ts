import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const css = fs.readFileSync(path.join(root, 'src/App.css'), 'utf8')

test('note focus tag picker is layered above the note editor overlay', () => {
  const picker = css.match(/\.focus-tag-select-layer\{[^}]*z-index:(\d+)/)
  const noteOverlayRules = [...css.matchAll(/\.notes-overlay,\.note-editor-overlay\{z-index:(\d+)\}/g)]
  expect(picker).not.toBeNull()
  expect(noteOverlayRules.length).toBeGreaterThan(0)
  const pickerZ = Number(picker![1])
  const noteZ = Math.max(...noteOverlayRules.map(match => Number(match[1])))
  expect(pickerZ).toBeGreaterThan(noteZ)
})
