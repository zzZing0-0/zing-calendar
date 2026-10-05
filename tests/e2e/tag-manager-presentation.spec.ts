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
  expect(managerSource).not.toContain('compact-tag-detail')
  expect(source).toContain('modal-layer tag-edit-layer')
  expect(source).toContain('compact-tag-edit-modal')
  expect(source).toContain('aria-labelledby="tag-edit-title"')
  expect(css).toContain('.tag-edit-layer{z-index:540}')
})

test('tag chips open one editor and the editor preserves existing tag actions', () => {
  expect(source).toContain('onClick={()=>setSelectedTagManageId(tag.id)}')
  expect(source).toContain('aria-label="关闭编辑标签"')
  expect(source).toContain('setTagArchived(tag.id,true);setSelectedTagManageId(null)')
  expect(source).toContain('onClick={()=>deleteTag(tag.id)}>删除</button>')
  expect(source).toContain('onClick={()=>setSelectedTagManageId(null)}>关闭</button>')
  expect(source).toContain('setNewTagScope(scope)')
})

test('tag edit modal stays mobile-safe and visually separate from the manager', () => {
  expect(css).toContain('.compact-tag-edit-modal{position:relative;z-index:1;width:min(520px,calc(100vw - 32px))}')
  expect(css).toContain('.compact-tag-edit-actions .ghost-button{margin-left:auto}')
  expect(css).toContain('.compact-tag-edit-modal{width:calc(100vw - 18px);max-height:calc(100dvh - 18px)}')
})


test('closing tag manager also clears its nested tag editor state', () => {
  const managerStart = source.indexOf('{tagManagerOpen && (')
  const editorStart = source.indexOf('{selectedTagManageId && (() => {', managerStart)
  const managerSource = source.slice(managerStart, editorStart)

  expect(managerSource).toContain('aria-label="关闭标签管理" onClick={() => {setSelectedTagManageId(null);setTagManagerOpen(false)}}')
  expect(managerSource).toContain('className="close-button" type="button" onClick={() => {setSelectedTagManageId(null);setTagManagerOpen(false)}}')
})

test('clicking an existing tag opens an interactive editor above the tag manager', async ({ page }) => {
  await page.goto('/')
  await page.locator('.bottom-nav').getByRole('button', { name: '设置' }).click()
  await page.getByRole('button', { name: /标签管理/ }).click()

  const manager = page.locator('.tag-manager')
  await expect(manager).toBeVisible()
  const name = `编辑测试-${Date.now()}`
  await manager.getByPlaceholder('新建共享').fill(name)
  await manager.getByRole('button', { name: '添加', exact: true }).click()

  const editor = page.getByRole('dialog', { name: '编辑标签' })
  await expect(editor).toBeHidden()
  await manager.getByRole('button', { name, exact: true }).click()
  await expect(editor).toBeVisible()
  const input = editor.getByRole('textbox', { name: '名称' })
  await expect(input).toBeEditable()
  await input.fill(`${name}-已编辑`)
  await expect(input).toHaveValue(`${name}-已编辑`)

  await editor.getByRole('button', { name: '关闭', exact: true }).click()
  await expect(editor).toBeHidden()
  await manager.getByRole('button', { name: `${name}-已编辑`, exact: true }).click()
  await expect(editor).toBeVisible()
  await expect(editor.getByRole('textbox', { name: '名称' })).toHaveValue(`${name}-已编辑`)
})
