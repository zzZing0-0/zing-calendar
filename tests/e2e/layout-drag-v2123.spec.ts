import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { readStylesheet } from '../helpers/applicationSource'
const editor=readFileSync('src/features/layout/LayoutOrderEditor.tsx','utf8')
const css=readStylesheet('src/App.css')
test('both editors support touch and mouse pointer drag using capture and hit testing',()=>{
 for(const required of ['onPointerDown','onPointerMove','onPointerUp','onPointerCancel','setPointerCapture','elementFromPoint','moveLayoutItem','data-layout-key'])expect(editor).toContain(required)
 expect(css).toContain('.layout-sort-list .layout-drag-handle{touch-action:none')
})
test('day fixed task is compact, without redundant status or explanation',()=>{
 expect(editor).toContain('layout-locked-item')
 expect(editor).not.toContain('固定第一')
 expect(editor).not.toContain('module-priority-hint')
 expect(editor).not.toContain('layout-fixed-row')
 expect(css).toContain('.layout-sort-list .module-priority-item{margin:0')
})
test('all movable rows retain accessible up/down controls and reset',()=>{
 expect(editor).toContain('上移${labels[key]??key}')
 expect(editor).toContain('下移${labels[key]??key}')
 expect(editor).toContain('恢复默认')
})
