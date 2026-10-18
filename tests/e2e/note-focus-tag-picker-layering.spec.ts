import { expect, test } from '@playwright/test'
import { readStylesheet } from '../helpers/applicationSource'

const root = process.cwd()
const css = readStylesheet('src/App.css')

test('note focus tag picker is layered above the note editor overlay', () => {
  const picker = css.match(/\.focus-tag-select-layer\{[^}]*z-index:(\d+)/)
  const noteOverlayRules = [...css.matchAll(/\.notes-overlay,\.note-editor-overlay\{z-index:(\d+)\}/g)]
  expect(picker).not.toBeNull()
  expect(noteOverlayRules.length).toBeGreaterThan(0)
  const pickerZ = Number(picker![1])
  const noteZ = Math.max(...noteOverlayRules.map(match => Number(match[1])))
  expect(pickerZ).toBeGreaterThan(noteZ)
})
