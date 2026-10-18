import { expect, test } from '@playwright/test'
import { readApplicationSource, readStylesheet } from '../helpers/applicationSource'

const app = readApplicationSource()
const css = readStylesheet('src/App.css')

test('task timer does not render redundant label around start button', () => {
  expect(app).not.toContain('<span className="task-timer-label">任务计时</span>')
  expect(app).toContain('onClick={()=>startTaskTimer(viewingTask)}')
  expect(app).toContain('onClick={()=>stopTaskTimer(viewingTask)}')
})

test('task timer panel has no nested card border or background', () => {
  expect(css).toMatch(/\.task-timer-panel\{[^}]*border:0;border-radius:0;background:transparent/s)
  expect(css).toMatch(/\.task-timer-panel\.running\{[^}]*background:transparent;border:0/s)
})
