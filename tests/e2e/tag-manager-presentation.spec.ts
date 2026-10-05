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
  expect(css).toContain('.tag-edit-layer{z-index:160}')
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
