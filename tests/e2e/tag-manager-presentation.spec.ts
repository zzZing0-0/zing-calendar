import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const source = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8')
const css = fs.readFileSync(path.resolve(process.cwd(), 'src/App.css'), 'utf8')

test('tag manager keeps creation and browsing in the main panel while editing opens a dedicated modal', () => {
  const managerStart = source.indexOf('{tagManagerOpen && (')
  const editorStart = source.indexOf('{selectedTagManageId && (() => {', managerStart)
  const managerSource = source.slice(managerStart, editorStart)
  expect(managerSource).toContain('compact-tag-create')
  expect(managerSource).toContain('compact-tag-list')
  expect(source).toContain('modal-layer tag-edit-layer')
  expect(source).toContain('compact-tag-edit-modal')
  expect(css).toContain('.tag-edit-layer{z-index:540}')
})

test('tag editor uses draft state with consistent secondary actions and an explicit save action', () => {
  expect(source).toContain('tagEditDraft')
  expect(source).toContain('saveTagEdit')
  expect(source).toContain('className="compact-tag-edit-secondary"')
  expect(source).toContain('className="save-button" onClick={()=>saveTagEdit(tag)}')
  expect(css).toContain('.compact-tag-edit-secondary{display:flex;align-items:center;gap:10px}')
  expect(css).toContain('.compact-tag-edit-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 24px 22px')
  expect(css).toContain('.compact-tag-edit-actions .ghost-button,.compact-tag-edit-actions .danger-button,.compact-tag-edit-actions .save-button{box-sizing:border-box;min-height:40px')
  expect(css).toContain('.compact-tag-edit-actions .danger-button{border:1px solid #ead8d5;background:#fff;color:#b56b63}')
})

test('closing tag manager also clears its nested tag editor state', () => {
  const managerStart = source.indexOf('{tagManagerOpen && (')
  const editorStart = source.indexOf('{selectedTagManageId && (() => {', managerStart)
  const managerSource = source.slice(managerStart, editorStart)
  expect(managerSource).toContain('setSelectedTagManageId(null);setTagEditDraft(null);setTagManagerOpen(false)')
})

test('tag edit modal stays mobile-safe and visually separate from the manager', () => {
  expect(css).toContain('.compact-tag-edit-modal{position:relative;z-index:1;width:min(520px,calc(100vw - 32px))}')
  expect(css).toContain('.compact-tag-edit-modal{width:calc(100vw - 18px);max-height:calc(100dvh - 18px)}')
})

test('tag edits are drafts: close discards them and save commits them', async ({ page }) => {
  await page.goto('/')
  await page.locator('.bottom-nav').getByRole('button', { name: '设置' }).click()
  await page.getByRole('button', { name: /标签管理/ }).click()
  const manager = page.locator('.tag-manager')
  const name = `草稿测试-${Date.now()}`
  await manager.getByPlaceholder('新建共享').fill(name)
  await manager.getByRole('button', { name: '添加', exact: true }).click()

  await manager.getByRole('button', { name, exact: true }).click()
  const editor = page.getByRole('dialog', { name: '编辑标签' })
  await expect(editor).toBeVisible()
  await editor.getByRole('textbox', { name: '名称' }).fill(`${name}-未保存`)
  await editor.getByRole('button', { name: '关闭编辑标签' }).click()
  await expect(editor).toBeHidden()
  await expect(manager.getByRole('button', { name, exact: true })).toBeVisible()
  await expect(manager.getByRole('button', { name: `${name}-未保存`, exact: true })).toHaveCount(0)

  await manager.getByRole('button', { name, exact: true }).click()
  await editor.getByRole('textbox', { name: '名称' }).fill(`${name}-已保存`)
  await editor.getByRole('button', { name: '保存', exact: true }).click()
  await expect(editor).toBeHidden()
  await expect(manager.getByRole('button', { name: `${name}-已保存`, exact: true })).toBeVisible()
})


test('tag manager regression › note is a first-class tag scope beside shared task and journal', () => {
  const app = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8')
  expect(app).toContain("['note','笔记']")
})


test('tag manager regression › focus is a first-class tag scope beside shared task journal and note', () => {
  const app = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf8')
  expect(app).toContain("['focus','专注']")
})


test('tag editor v2.9.1 regression › shows actual module references below scope without storing usage metadata', () => {
  expect(source).toContain("当前引用：{tagUsageAreas(tag.id).join(' · ') || '暂无'}")
  expect(source).toContain("taskUsed && '任务'")
  expect(source).toContain("focusUsed && '专注'")
  expect(source).toContain("journalUsed && '记录'")
  expect(source).toContain("noteUsed && '笔记'")
  expect(css).toContain('.tag-usage-hint{display:block;margin-top:7px')
})

test('tag editor v2.9.1 regression › focus usage includes free focus and task timer attribution', () => {
  const helperStart = source.indexOf('const tagUsageAreas = (id: string) => {')
  const helperEnd = source.indexOf('const setTagArchived', helperStart)
  const helper = source.slice(helperStart, helperEnd)
  expect(helper).toContain('focusSessions.some')
  expect(helper).toContain('activeTimerFocusTagIds')
  expect(helper).toContain('timerSessions')
  expect(helper).toContain('recurrenceExceptions')
})


test('tag editor v2.9.2 regression › multiple real usage areas force shared scope', () => {
  expect(source).toContain("if (usage.length > 1) return false")
  expect(source).toContain("跨多个分类使用时必须保持共享")
  expect(source).toContain("const blocked=!canSetTagScope(tag.id,scope)")
  expect(source).toContain("disabled={blocked}")
})

test('tag editor v2.9.2 regression › one real usage area can narrow only to that matching scope', () => {
  expect(source).toContain("if (usage.length === 0) return true")
  expect(source).toContain("return scopeForUsage[usage[0]] === nextScope")
  expect(source).toContain("当前仅实际用于")
})

test('tag editor v2.9.2 regression › save path revalidates scope invariant', () => {
  expect(source).toContain("const blockedReason = tagScopeBlockedReason(tag.id, tagEditDraft.scope)")
  expect(source).toContain("setAutoSyncToast(`⚠ ${blockedReason}`)")
})



test('settings v2.9.5 regression › visual rules target the Settings classes actually mounted by App', () => {
  for (const className of ['page-heading', 'settings-group', 'settings-group-title', 'setting-row']) {
    expect(source).toContain(className)
    expect(css).toContain(`.settings-page .${className}`)
  }
})

test('settings v2.9.5 regression › focus controls share the same typography hierarchy despite different control layouts', () => {
  expect(source).toContain('max-focus-setting')
  expect(source).toContain('focus-wake-lock-setting')
  expect(css).toContain('.settings-page .max-focus-setting label')
  expect(css).toContain('.settings-page .focus-wake-lock-setting label')
  expect(css).toContain('font-size:16px')
})

test('settings v2.9.5 regression › every Settings group title gets the same divider treatment', () => {
  expect(source).toContain('settings-group-title')
  expect(css).toMatch(/\.settings-page \.settings-group-title\{[\s\S]*border-bottom:1px solid/)
})

test('settings v2.9.5 regression › invalid tag scopes remain visibly disabled', () => {
  expect(source).toContain("blocked?'scope-disabled':''")
  expect(css).toContain('.tag-scope-grid button.scope-disabled')
  expect(css).toContain('cursor:not-allowed')
})


test('settings v2.9.6 regression › Settings title is an h2 and its scoped rule targets that exact element', () => {
  expect(source).toContain('<span className="eyebrow">SETTINGS</span><h2>设置</h2>')
  expect(css).toContain('.settings-page .page-heading h2{')
  expect(css).not.toContain('.settings-page .page-heading h1{')
})

test('settings v2.9.6 regression › mobile Settings title rule also targets h2 rather than a nonexistent h1', () => {
  expect(css).toContain('.settings-page .page-heading h2{font-size:27px}')
  expect(css).not.toContain('.settings-page .page-heading h1{font-size:27px}')
})
