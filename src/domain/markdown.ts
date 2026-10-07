/** Toggle a GFM task marker on a specific 1-based source line without relying on item text. */
export function toggleMarkdownTaskAtLine(content: string, lineNumber: number, checked: boolean): string {
  if (!Number.isInteger(lineNumber) || lineNumber < 1) return content
  const lines = content.split('\n')
  const index = lineNumber - 1
  if (index >= lines.length) return content
  const line = lines[index]
  if (!/^(\s*[-+*]\s+)\[[ xX]\]/.test(line)) return content
  lines[index] = line.replace(/^(\s*[-+*]\s+)\[[ xX]\]/, `$1[${checked ? 'x' : ' '}]`)
  return lines.join('\n')
}

/** Toggle the GFM task marker on the source line containing a textarea cursor offset. */
export function toggleMarkdownTaskAtOffset(content: string, offset: number): string {
  if (!Number.isInteger(offset) || offset < 0 || offset > content.length) return content
  const before = content.slice(0, offset)
  const lineNumber = before.split('\n').length
  const line = content.split('\n')[lineNumber - 1] ?? ''
  const match = line.match(/^(\s*[-+*]\s+)\[([ xX])\]/)
  if (!match) return content
  return toggleMarkdownTaskAtLine(content, lineNumber, match[2].toLowerCase() !== 'x')
}
