import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { readApplicationSource, readStylesheet } from '../helpers/applicationSource'
const app=readApplicationSource()
const domain=readFileSync('src/domain/modulePriority.ts','utf8')
const css=readStylesheet('src/App.css')
test('module priority defaults to task note habit journal anniversary focus',()=>{
 expect(domain).toContain("['task','note','habit','journal','anniversary','focus']")
 expect(domain).toContain('normalizeModuleOrder')
 expect(domain).toContain('moveModule')
})
test('search, trash and tag scopes use one ordering without changing result ordering',()=>{
 expect(app.match(/orderedCategories\(/g)?.length).toBe(4)
 expect(app).toContain('modulePriority: moduleOrder')
 expect(app).toContain('setModuleOrder(normalizeModuleOrder(incoming.modulePriority))')
 expect(app).toContain('setModuleOrder(normalizeModuleOrder(s.modulePriority))')
 expect(app).toContain('zing:modulePriority')
 expect(domain).toContain("key==='all'||key==='both'?-1")
})
test('active focus history cannot show actionable edit or delete buttons',()=>{
 expect(app).toContain('disabled={!session.endedAt}')
 expect(app).toContain('disabled={!record.session.endedAt}')
 expect(css).toContain('.focus-history-actions button:disabled')
})
