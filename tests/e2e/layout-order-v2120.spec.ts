import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
const app=readFileSync('src/App.tsx','utf8')
const domain=readFileSync('src/domain/layoutPreferences.ts','utf8')
const settings=readFileSync('src/domain/settings.ts','utf8')
const css=readFileSync('src/App.css','utf8')

test('day detail keeps task fixed, while mood calendar and other sections are independently sortable',()=>{
 expect(domain).toContain("['mood','energy','calendar','journal','habit','period']")
 expect(app).toContain('task-section" style={{order:1}}')
 for(const key of ['mood','energy','calendar','journal','habit','period']) expect(app).toContain(`daySectionStyle("${key}")`)
 expect(app).toContain('setLayoutEditor(\'day\')')
})
test('settings sorts only top-level groups with fixed layout entry',()=>{
 expect(domain).toContain('DEFAULT_SETTINGS_GROUP_ORDER')
 expect(app).toContain('className="settings-group layout-settings-group"')
 expect(css).toContain('.settings-page > .layout-settings-group {order:2}')
 for(const key of ['navigation','tasks','focus','random','tags','weather','encouragement','wordcloud','sync','data','links'])expect(app).toContain(`settingsGroupStyle('${key}')`)
})
test('settings order survives local persistence, cloud sync and ZIP backup',()=>{
 for(const key of ['daySectionOrder','settingsGroupOrder']){
  expect(app).toContain(`zing:${key}`)
  expect(app).toContain(key)
  expect(settings).toContain(`normalize${key==='daySectionOrder'?'DaySectionOrder':'SettingsGroupOrder'}`)
 }
 expect(app).toContain('setDaySectionOrder(normalizeDaySectionOrder(incoming.daySectionOrder))')
 expect(app).toContain('setSettingsGroupOrder(normalizeSettingsGroupOrder(incoming.settingsGroupOrder))')
})
test('sync preview sorts both count and change rows without altering merge',()=>{
 expect(app).toContain('const changedRows=syncPreviewRowsByModule(')
 expect(app).toContain('changedRows.map(row=><div className="sync-summary-row')
 expect(app).toContain('changedRows.map(row=>{')
 expect(domain).toContain('Sorting is presentation-only')
})
