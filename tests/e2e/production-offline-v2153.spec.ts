import { test, expect } from '@playwright/test'
import { spawn, type ChildProcess } from 'node:child_process'
import { readFileSync } from 'node:fs'

let server: ChildProcess
const origin = 'http://127.0.0.1:4174'
test.beforeAll(async () => {
  // A build is an explicit prerequisite; never build or touch source in a test.
  const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
  expect(readFileSync('dist/sw.js', 'utf8')).toContain(`zing-calendar-app-v${version}`)
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4174', '--strictPort'], { stdio: 'pipe' })
  await new Promise<void>((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error('Production preview startup timed out')), 15_000)
    server.once('error', error => { clearTimeout(deadline); reject(error) })
    server.once('exit', code => { clearTimeout(deadline); reject(new Error(`Production preview exited: ${code}`)) })
    server.stdout?.on('data', chunk => { if (String(chunk).includes('4174')) { clearTimeout(deadline); resolve() } })
  })
})
test.afterAll(() => { server?.kill() })

test('the production service worker reopens offline with durable UI edits and the release footer', async ({ page, context }) => {
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort())
  await page.goto(origin)
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
  const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
  await expect(page.locator('.status-version')).toHaveText(`Zing Calendar · v${version}`)
  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('.status-version')).toHaveText(`Zing Calendar · v${version}`)
  await page.locator('.continuous-calendar .day-cell.today').first().click()
  const drawer = page.locator('.day-drawer')
  await drawer.getByRole('button', { name: '＋ 添加任务', exact: true }).click()
  const editor = page.getByRole('dialog', { name: '添加任务', exact: true })
  await editor.getByPlaceholder('要做什么？').fill('生产离线隔离任务')
  await editor.getByRole('button', { name: '保存任务', exact: true }).click()
  await expect(drawer.locator('.task-item').filter({ hasText: '生产离线隔离任务' })).toBeVisible()
  // Await transaction completion, rather than reloading between React render and persistence.
  await expect.poll(() => page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('zing-calendar')
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error)
    })
    try { return await new Promise<boolean>((resolve, reject) => {
      const request = db.transaction('tasks', 'readonly').objectStore('tasks').getAll()
      request.onsuccess = () => resolve(request.result.some(row => row.title === '生产离线隔离任务')); request.onerror = () => reject(request.error)
    }) } finally { db.close() }
  })).toBe(true)
  await page.reload()
  await page.locator('.continuous-calendar .day-cell.today').first().click()
  await expect(drawer.locator('.task-item').filter({ hasText: '生产离线隔离任务' })).toBeVisible()
})
