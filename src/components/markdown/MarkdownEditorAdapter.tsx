import { useEffect, useRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import MDEditor, { commands } from '@uiw/react-md-editor'
import { toggleMarkdownTaskAtOffset } from '../../domain/markdown'

const headingGroup = commands.group(
  [commands.title1, commands.title2, commands.title3, commands.title4, commands.title5, commands.title6],
  {
    name: 'zing-heading',
    groupName: 'zing-heading',
    icon: <span className="zing-heading-command">H⌄</span>,
    buttonProps: { 'aria-label': '选择标题级别', title: '标题' },
  },
)

type ToolbarCommand = { buttonProps?: ButtonHTMLAttributes<HTMLButtonElement> | null }

function withChineseTitle<T extends ToolbarCommand>(command:T,title:string):T {
  return {
    ...command,
    buttonProps: { ...(command.buttonProps ?? {}), title, 'aria-label': title },
  } as T
}

const toolbarCommands = {
  bold: withChineseTitle(commands.bold,'粗体'),
  italic: withChineseTitle(commands.italic,'斜体'),
  strike: withChineseTitle(commands.strikethrough,'删除线'),
  unordered: withChineseTitle(commands.unorderedListCommand,'无序列表'),
  ordered: withChineseTitle(commands.orderedListCommand,'有序列表'),
  checklist: withChineseTitle(commands.checkedListCommand,'插入清单'),
  quote: withChineseTitle(commands.quote,'引用'),
  link: withChineseTitle(commands.link,'插入链接'),
  table: withChineseTitle(commands.table,'插入表格'),
  code: withChineseTitle(commands.code,'行内代码'),
  codeBlock: withChineseTitle(commands.codeBlock,'代码块'),
  hr: withChineseTitle(commands.hr,'分隔线'),
}

export function MarkdownEditorAdapter({value,onChange,onScrollRatio}:{value:string;onChange:(value:string)=>void;onScrollRatio?:(ratio:number)=>void}) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!onScrollRatio) return
    const root = rootRef.current
    if (!root) return
    // Scroll events do not bubble, but they can be observed during capture. Listen at
    // the adapter boundary so whichever UIW descendant owns the viewport can report
    // progress without coupling Zing to UIW's internal class names or mount timing.
    const report = (event: Event) => {
      const scroller = event.target as HTMLElement | null
      if (!scroller || !root.contains(scroller)) return
      const max = scroller.scrollHeight - scroller.clientHeight
      if (max > 1) onScrollRatio(scroller.scrollTop / max)
    }
    root.addEventListener('scroll', report, { capture: true, passive: true })
    return () => root.removeEventListener('scroll', report, { capture: true })
  }, [onScrollRatio])
  const toggleCurrentTask = {
    name: 'zing-toggle-task',
    keyCommand: 'zing-toggle-task',
    icon: <svg className="zing-toggle-task-command" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.2 6.4 11.5 13 4.8" /></svg>,
    buttonProps: { 'aria-label': '切换当前清单完成状态', title: '勾选/取消当前清单（先把光标放在该行）', onMouseDown: (event: any) => event.preventDefault() },
    execute: () => {
      const textarea = document.querySelector<HTMLTextAreaElement>('.zing-md-editor textarea')
      if (!textarea) return
      const cursor = textarea.selectionStart
      const root = rootRef.current
      // UIW is a controlled editor. Updating `value` can re-run its own selection/scroll
      // bookkeeping after React commits. Preserve every relevant viewport rather than
      // assuming one internal UIW node owns scrolling. This mirrors the task-note
      // pseudo-checklist: mutate the source line, then restore focus/selection in place.
      const scrollSnapshots = root
        ? [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))]
            .filter(el => el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth)
            .map(el => ({ el, top: el.scrollTop, left: el.scrollLeft }))
        : []
      const pageX = window.scrollX
      const pageY = window.scrollY
      const next = toggleMarkdownTaskAtOffset(value, cursor)
      if (next === value) return
      onChange(next)
      const restore = () => {
        const nextTextarea = rootRef.current?.querySelector<HTMLTextAreaElement>('textarea')
        if (!nextTextarea) return
        nextTextarea.focus({ preventScroll: true })
        nextTextarea.setSelectionRange(cursor, cursor)
        for (const snapshot of scrollSnapshots) {
          if (snapshot.el.isConnected) {
            snapshot.el.scrollTop = snapshot.top
            snapshot.el.scrollLeft = snapshot.left
          }
        }
        window.scrollTo(pageX, pageY)
      }
      // Restore after React and after UIW's own post-update layout work.
      requestAnimationFrame(() => {
        restore()
        requestAnimationFrame(() => {
          restore()
          setTimeout(restore, 0)
        })
      })
    },
  }

  return <div ref={rootRef} data-color-mode="light" className="zing-md-editor"><MDEditor value={value} onChange={next=>onChange(next??'')} preview="edit" height="100%" commands={[
    headingGroup,toolbarCommands.bold,toolbarCommands.italic,toolbarCommands.strike,
    commands.divider,
    toolbarCommands.unordered,toolbarCommands.ordered,toolbarCommands.checklist,toggleCurrentTask,toolbarCommands.quote,
    commands.divider,
    toolbarCommands.link,toolbarCommands.table,
    commands.divider,
    toolbarCommands.code,toolbarCommands.codeBlock,toolbarCommands.hr,
  ]} extraCommands={[]} /></div>
}
