import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.cwd())
const read = (file:string) => fs.readFileSync(path.join(root,file),'utf8')

test('external import owns its controller and modal outside App', () => {
  const app = read('src/App.tsx')
  const controller = read('src/features/external-import/useExternalImport.ts')
  const modal = read('src/features/external-import/ExternalImportModal.tsx')

  expect(app).toContain("from './features/external-import/useExternalImport'")
  expect(app).toContain("from './features/external-import/ExternalImportModal'")
  expect(app).toContain('const externalImport = useExternalImport({')
  expect(app).toContain('defaultPriority')
  expect(app).toContain('<ExternalImportModal controller={externalImport} />')
  expect(app).not.toContain('const inspectForestCsv = async')
  expect(app).not.toContain('const inspectDidaCsv = async')
  expect(app).not.toContain('const inspectGenericCsv = async')
  expect(controller).toContain('export function useExternalImport')
  expect(controller).toContain('const inspectForestCsv = async')
  expect(controller).toContain('const inspectDidaCsv = async')
  expect(controller).toContain('const inspectGenericCsv = async')
  expect(modal).toContain('export function ExternalImportModal')
})

test('App remains composition owner rather than reimplementing extracted feature parsing', () => {
  const app = read('src/App.tsx')
  expect(app).not.toContain('parseDidaRecurrence(')
  expect(app).not.toContain('forestDate(')
  expect(app).not.toContain('genericHeaderIndex(')
})
