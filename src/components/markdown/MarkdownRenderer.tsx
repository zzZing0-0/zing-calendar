import { Children, isValidElement, useState, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function textFromNode(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textFromNode).join('')
  if (isValidElement<{children?: ReactNode}>(node)) return textFromNode(node.props.children)
  return ''
}

function CodeBlock({children}:{children?: ReactNode}) {
  const [copied,setCopied]=useState(false)
  const child=Children.toArray(children)[0]
  const language=isValidElement<{className?:string}>(child)
    ? child.props.className?.match(/language-([\w-]+)/)?.[1]
    : undefined
  const code=textFromNode(children).replace(/\n$/, '')
  const copy=async()=>{
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(()=>setCopied(false),1600)
    } catch {
      setCopied(false)
    }
  }
  return <div className="zing-code-block">
    <div className="zing-code-block-bar">
      <span>{language??'代码'}</span>
      <button type="button" onClick={copy} aria-label="复制代码">{copied?'✓ 已复制':'复制'}</button>
    </div>
    <pre>{children}</pre>
  </div>
}

export function MarkdownRenderer({content}:{content:string}) {
  return <div className="zing-markdown"><ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      pre: ({children})=><CodeBlock>{children}</CodeBlock>,
      a: ({children,...props})=><a {...props} target="_blank" rel="noopener noreferrer">{children}</a>,
      table: ({children,...props})=><div className="zing-table-scroll"><table {...props}>{children}</table></div>,
    }}
  >{content}</ReactMarkdown></div>
}
