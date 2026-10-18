import { expect, test } from '@playwright/test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { syncVersion } from '../../scripts/version.mjs'
import { renderServiceWorker } from '../../scripts/service-worker.mjs'

test('release tooling synchronizes the package and lockfile and rejects version reuse', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'zing-version-'))
  try {
    writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version: '2.15.2' }))
    writeFileSync(path.join(root, 'package-lock.json'), JSON.stringify({ version: '2.15.2', packages: { '': { version: '2.15.2' }, preserved: { version: '1.0.0' } } }))
    expect(syncVersion(root, '2.15.3')).toBe('2.15.3')
    expect(syncVersion(root)).toBe('2.15.3')
    const lock = JSON.parse(readFileSync(path.join(root, 'package-lock.json'), 'utf8'))
    expect(lock.packages[''].version).toBe('2.15.3')
    expect(lock.packages.preserved.version).toBe('1.0.0')
    for (const version of ['2.15.3', '2.15.2', '2.14.99', 'not-a-version']) expect(() => syncVersion(root, version)).toThrow()
    lock.version = '2.15.2'
    writeFileSync(path.join(root, 'package-lock.json'), JSON.stringify(lock))
    expect(() => syncVersion(root)).toThrow('disagree')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('the production worker cache version is generated from the release manifest', () => {
  const manifest = JSON.parse(readFileSync('package.json', 'utf8'))
  const source = readFileSync('public/sw.js', 'utf8')
  const result = renderServiceWorker(source, manifest.version)
  expect(result).toContain(`zing-calendar-app-v${manifest.version}`)
  expect(result).not.toContain('__ZING_RELEASE_VERSION__')
  expect(() => renderServiceWorker(source, 'bad')).toThrow()
  expect(() => renderServiceWorker('no template', manifest.version)).toThrow()
})

test('the visible site footer reads the package version', async ({ page, context }) => {
  await context.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:4173' ? route.continue() : route.abort())
  await page.goto('/')
  const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
  await expect(page.locator('.status-version')).toHaveText(`Zing Calendar · v${version}`)
})
