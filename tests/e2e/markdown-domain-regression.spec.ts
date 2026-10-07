import { expect, test } from '@playwright/test'
import { toggleMarkdownTaskAtLine, toggleMarkdownTaskAtOffset } from '../../src/domain/markdown'

test('markdown domain regression › checklist toggles only the requested source line even for duplicate labels', () => {
  const source='- [ ] 重复\n- [ ] 重复\n普通文字'
  expect(toggleMarkdownTaskAtLine(source,2,true)).toBe('- [ ] 重复\n- [x] 重复\n普通文字')
})

test('markdown domain regression › checklist supports checked variants and never mutates a non-task line', () => {
  expect(toggleMarkdownTaskAtLine('- [X] 完成',1,false)).toBe('- [ ] 完成')
  expect(toggleMarkdownTaskAtLine('普通文字',1,true)).toBe('普通文字')
  expect(toggleMarkdownTaskAtLine('- [ ] 项目',9,true)).toBe('- [ ] 项目')
})


test('cursor-offset task toggling changes only the checklist line containing the editor cursor', () => {
  const source='- [ ] first\n- [ ] duplicate\n- [ ] duplicate\n- [x] last'
  const cursor=source.indexOf('- [ ] duplicate', source.indexOf('- [ ] duplicate')+1)+8
  expect(toggleMarkdownTaskAtOffset(source,cursor)).toBe('- [ ] first\n- [ ] duplicate\n- [x] duplicate\n- [x] last')
})

test('cursor-offset task toggling leaves ordinary lines unchanged', () => {
  const source='plain text\n- [ ] task'
  expect(toggleMarkdownTaskAtOffset(source,3)).toBe(source)
})
