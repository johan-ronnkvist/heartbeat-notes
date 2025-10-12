/**
 * Markdown rendering utilities using marked library
 */
import { marked } from 'marked'
import type { Editor } from '@tiptap/core'
import type { JSONContent } from '@tiptap/core'

// Configure marked for security and desired features
marked.setOptions({
  breaks: true, // Convert \n to <br>
  gfm: true, // GitHub Flavored Markdown
})

/**
 * Render markdown string to HTML
 */
export function renderMarkdown(markdown: string): string {
  if (!markdown || markdown.trim() === '') {
    return ''
  }
  return marked.parse(markdown) as string
}

/**
 * Convert TipTap editor content to Markdown
 */
export function editorToMarkdown(editor: Editor): string {
  const json = editor.getJSON()
  return jsonToMarkdown(json)
}

/**
 * Convert TipTap JSON to Markdown
 */
function jsonToMarkdown(node: JSONContent, listLevel = 0, orderIndex?: number): string {
  if (!node) return ''

  switch (node.type) {
    case 'doc':
      return node.content?.map((n) => jsonToMarkdown(n)).join('\n\n') || ''

    case 'paragraph':
      return node.content?.map((n) => jsonToMarkdown(n)).join('') || ''

    case 'heading':
      const level = node.attrs?.level || 1
      const headingContent = node.content?.map((n) => jsonToMarkdown(n)).join('') || ''
      return '#'.repeat(level) + ' ' + headingContent

    case 'bulletList':
      return node.content?.map((n) => jsonToMarkdown(n, listLevel)).join('\n') || ''

    case 'orderedList':
      return node.content?.map((n, i) => jsonToMarkdown(n, listLevel, i + 1)).join('\n') || ''

    case 'listItem':
      const indent = '  '.repeat(listLevel)
      const bullet = orderIndex !== undefined ? `${orderIndex}.` : '-'
      const itemContent =
        node.content?.map((n) => jsonToMarkdown(n, listLevel + 1)).join('\n') || ''
      return indent + bullet + ' ' + itemContent

    case 'codeBlock':
      const code = node.content?.map((n) => n.text || '').join('') || ''
      const language = node.attrs?.language || ''
      return '```' + language + '\n' + code + '\n```'

    case 'blockquote':
      const quoteContent = node.content?.map((n) => jsonToMarkdown(n)).join('\n') || ''
      return quoteContent
        .split('\n')
        .map((line: string) => '> ' + line)
        .join('\n')

    case 'horizontalRule':
      return '---'

    case 'hardBreak':
      return '  \n'

    case 'text':
      let text = node.text || ''

      // Apply marks in reverse order to handle nested marks
      if (node.marks) {
        node.marks.forEach((mark) => {
          switch (mark.type) {
            case 'bold':
            case 'italic':
            case 'strike':
              // Trim spaces and move them outside the markers
              const leadingSpace = text.match(/^(\s*)/)?.[1] || ''
              const trailingSpace = text.match(/(\s*)$/)?.[1] || ''
              const trimmedText = text.trim()

              if (trimmedText) {
                const marker = mark.type === 'bold' ? '**' : mark.type === 'italic' ? '*' : '~~'
                text = `${leadingSpace}${marker}${trimmedText}${marker}${trailingSpace}`
              }
              break
            case 'code':
              // Code can have spaces, don't trim
              text = `\`${text}\``
              break
            case 'link':
              text = `[${text}](${mark.attrs?.href || ''})`
              break
          }
        })
      }

      return text

    default:
      return ''
  }
}

/**
 * Convert markdown to plain text for copying
 */
export function markdownToPlainText(markdown: string): string {
  if (!markdown || markdown.trim() === '') {
    return ''
  }

  return (
    markdown
      // Remove bold
      .replace(/\*\*(.+?)\*\*/g, '$1')
      // Remove italic
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      // Remove strikethrough
      .replace(/~~(.+?)~~/g, '$1')
      // Remove inline code
      .replace(/`(.+?)`/g, '$1')
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove headers
      .replace(/^#{1,6}\s+/gm, '')
      // Convert unordered list markers to bullets
      .replace(/^[-*+]\s+/gm, '• ')
      // Remove ordered list numbers
      .replace(/^\d+\.\s+/gm, '• ')
      // Clean up extra whitespace
      .trim()
  )
}
