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
  expect(css).toContain('.compact-tag-edit-secondary{display:flex;align-items:center;gap:8px}')
  expect(css).toContain('.compact-tag-edit-actions .ghost-button,.compact-tag-edit-actions .danger-button,.compact-tag-edit-actions .save-button{min-height:40px')
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
