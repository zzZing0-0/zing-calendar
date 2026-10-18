/** Isolated identity/ledger fixture. Never forwards to a real GitHub/B2 service. */
export function mockB2Authorization(upstream?: typeof fetch) {
  const values = { ZING_B2_GITHUB_USER_IDS: '123', ZING_B2_GITHUB_REPOSITORY: 'fixture/ledger', ZING_B2_GITHUB_REPOSITORY_ID: '456', ZING_B2_GITHUB_BRANCH: 'main', ZING_B2_GITHUB_BUNDLE_PATH: 'zing/sync-bundle.json', ZING_B2_CONDITIONAL_PUT_VERIFIED: 'true' }
  const before = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]))
  const original = globalThis.fetch
  Object.assign(process.env, values)
  globalThis.fetch = (async (input, init) => {
    const url = String(input)
    if (url === 'https://api.github.com/user') return Response.json({ id: 123 })
    if (url === 'https://api.github.com/repos/fixture/ledger') return Response.json({ id: 456, full_name: 'fixture/ledger', private: true, permissions: { push: true } })
    if (url === 'https://api.github.com/repos/fixture/ledger/contents/zing/sync-bundle.json?ref=main') return Response.json({ type: 'file', sha: 'a'.repeat(40), encoding: 'base64', content: Buffer.from(JSON.stringify({protocolVersion:1,records:[],tombstones:[]})).toString('base64') })
    if (upstream) return upstream(input, init)
    throw new Error('Unexpected external request in isolated B2 test')
  }) as typeof fetch
  return () => {
    globalThis.fetch = original
    for (const [key, value] of Object.entries(before)) { if (value === undefined) delete process.env[key]; else process.env[key] = value }
  }
}
