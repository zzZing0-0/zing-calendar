import { expect, type Page } from '@playwright/test'

/** A fresh Playwright context owns the real test IndexedDB, with no App effects or remote services. */
export async function safetyHarness(page: Page) {
  const origin = 'http://127.0.0.1:4173'
  await page.context().route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.origin !== origin) return route.abort('blockedbyclient')
    if (url.pathname === '/safety-harness.html') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Isolated safety harness</title>' })
    return route.continue()
  })
  await page.goto('/safety-harness.html')
}

export async function databaseCall<T>(page: Page, expression: string): Promise<T> {
  return page.evaluate(async expression => {
    const db = await import('/src/db/calendar.ts')
    return Function('db', `return (async () => { ${expression} })()`)(db)
  }, expression) as Promise<T>
}

export async function seedTask(page: Page) {
  await databaseCall(page, `await db.saveTasks([{id:'original',title:'原始数据',date:'2026-10-18',updatedAt:'2026-10-18T09:00:00.000Z'}]);`)
  await expect.poll(() => databaseCall(page, 'return (await db.loadTasks()).length')).toBe(1)
}
