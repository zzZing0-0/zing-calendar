import { expect, test, type BrowserContext, type Page } from '@playwright/test'

const encode64 = (value: string) => Buffer.from(value, 'utf8').toString('base64')
const decode64 = (value: string) => Buffer.from(value, 'base64').toString('utf8')

async function moduleCall<T>(page: Page, expression: string): Promise<T> {
  return page.evaluate(async expression => {
    const db: any = await import('/src/db/calendar.ts')
    return await Function('db', `return (async()=>(${expression}))()`)(db)
  }, expression) as Promise<T>
}

async function attachGitHubProxy(context: BrowserContext, cloud: { json?: string; sha?: string; conflictsLeft?: number }) {
  await context.route('**/api/github-sync', async route => {
    const envelope = JSON.parse(route.request().postData() || '{}') as { method: string; path: string; body?: string }
    if (envelope.method === 'GET' && envelope.path.includes('/contents/')) {
      if (!cloud.json) return route.fulfill({ status: 404, body: 'not found' })
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ type: 'file', encoding: 'base64', content: encode64(cloud.json), sha: cloud.sha ?? 'sha-1' }) })
    }
    if (envelope.method === 'PUT' && envelope.path.includes('/contents/')) {
      if ((cloud.conflictsLeft ?? 0) > 0) {
        cloud.conflictsLeft = (cloud.conflictsLeft ?? 0) - 1
        return route.fulfill({ status: 409, body: 'conflict' })
      }
      const body = JSON.parse(envelope.body || '{}') as { content: string }
      cloud.json = decode64(body.content)
      cloud.sha = `sha-${Date.now()}`
      return route.fulfill({ status: 201, contentType: 'application/json', body: '{}' })
    }
    return route.fulfill({ status: 500, body: `unexpected ${envelope.method} ${envelope.path}` })
  })
}

const config = `{owner:'owner',repo:'repo',branch:'main',token:'test-token'}`

test.describe('GitHub sync provider integration regression', () => {
  test('two isolated devices converge through the actual GitHub proxy protocol', async ({ browser }) => {
    const cloud: { json?: string; sha?: string } = {}
    const a = await browser.newContext(), b = await browser.newContext()
    await attachGitHubProxy(a, cloud); await attachGitHubProxy(b, cloud)
    const pa = await a.newPage(), pb = await b.newPage(); await pa.goto('/'); await pb.goto('/'); await pa.waitForTimeout(250); await pb.waitForTimeout(250)
    await moduleCall(pa, `db.saveTasks([{id:'gh-a',title:'from GitHub A',date:'2026-10-04',updatedAt:'2026-10-04T10:00:00.000Z'}])`)
    const first:any = await moduleCall(pa, `db.syncWithGitHub(${config})`)
    expect(first.initializedRemote).toBe(true)
    const second:any = await moduleCall(pb, `db.syncWithGitHub(${config})`)
    expect(second.initializedRemote).toBe(false)
    const bTasks:any[] = await moduleCall(pb, 'db.loadTasks()')
    expect(bTasks.find(x => x.id === 'gh-a')?.title).toBe('from GitHub A')
    expect(JSON.parse(cloud.json!).records.some((x:any) => x.entityType === 'task' && x.entityId === 'gh-a')).toBeTruthy()
    await a.close(); await b.close()
  })

  test('SHA conflict retries by re-reading cloud state instead of overwriting blindly', async ({ browser }) => {
    const cloud: { json?: string; sha?: string; conflictsLeft?: number } = { conflictsLeft: 1 }
    const context = await browser.newContext(); await attachGitHubProxy(context, cloud)
    const page = await context.newPage(); await page.goto('/'); await page.waitForTimeout(250)
    await moduleCall(page, `db.saveTasks([{id:'retry',title:'retry safely',date:'2026-10-04',updatedAt:'2026-10-04T10:00:00.000Z'}])`)
    const result:any = await moduleCall(page, `db.syncWithGitHub(${config})`)
    expect(result.pushedRecords).toBeGreaterThan(0)
    expect(cloud.conflictsLeft).toBe(0)
    expect(JSON.parse(cloud.json!).records.some((x:any) => x.entityId === 'retry')).toBeTruthy()
    await context.close()
  })
})
