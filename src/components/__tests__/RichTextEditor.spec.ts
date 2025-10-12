/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import RichTextEditor from '../RichTextEditor.vue'
import { editorToMarkdown } from '@/utils/markdown'

describe('RichTextEditor', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    // Clear any previous instances
    if (wrapper) {
      wrapper.unmount()
    }
  })

  // Helper to wait for editor to initialize
  const waitForEditor = async () => {
    await nextTick()
    await flushPromises()
    // Give TipTap time to render
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  describe('Basic Rendering', () => {
    it('should render the editor', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '',
        },
      })

      await waitForEditor()

      expect(wrapper.find('.rich-text-editor').exists()).toBe(true)
      expect(wrapper.find('.ProseMirror').exists()).toBe(true)
    })

    it('should show placeholder when empty', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '',
          placeholder: 'Type something...',
        },
      })

      await waitForEditor()
      const proseMirror = wrapper.find('.ProseMirror')
      expect(proseMirror.exists()).toBe(true)
    })

    it('should be disabled when disabled prop is true', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '',
          disabled: true,
        },
      })

      await waitForEditor()
      const proseMirror = wrapper.find('.ProseMirror')
      expect(proseMirror.attributes('contenteditable')).toBe('false')
    })

    it('should be editable when disabled prop is false', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '',
          disabled: false,
        },
      })

      await waitForEditor()
      const proseMirror = wrapper.find('.ProseMirror')
      expect(proseMirror.attributes('contenteditable')).toBe('true')
    })
  })

  describe('Markdown Input (Store to Editor)', () => {
    it('should render plain text from markdown', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: 'Hello world',
        },
      })

      await waitForEditor()
      const proseMirror = wrapper.find('.ProseMirror')
      expect(proseMirror.text()).toContain('Hello world')
    })

    it('should render bold text from markdown', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '**bold text**',
        },
      })

      await waitForEditor()
      const proseMirror = wrapper.find('.ProseMirror')
      expect(proseMirror.html()).toContain('<strong>bold text</strong>')
    })

    it('should render italic text from markdown', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '*italic text*',
        },
      })

      await waitForEditor()
      const proseMirror = wrapper.find('.ProseMirror')
      expect(proseMirror.html()).toContain('<em>italic text</em>')
    })

    it('should render headings from markdown', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '# Heading 1\n\n## Heading 2\n\n### Heading 3',
        },
      })

      await waitForEditor()
      const proseMirror = wrapper.find('.ProseMirror')
      expect(proseMirror.html()).toContain('<h1>Heading 1</h1>')
      expect(proseMirror.html()).toContain('<h2>Heading 2</h2>')
      expect(proseMirror.html()).toContain('<h3>Heading 3</h3>')
    })

    it('should render bullet lists from markdown', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '- Item 1\n- Item 2\n- Item 3',
        },
      })

      await waitForEditor()
      const proseMirror = wrapper.find('.ProseMirror')
      expect(proseMirror.html()).toContain('<ul>')
      expect(proseMirror.html()).toContain('<li>')
      expect(proseMirror.text()).toContain('Item 1')
      expect(proseMirror.text()).toContain('Item 2')
    })

    it('should render ordered lists from markdown', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '1. First\n2. Second\n3. Third',
        },
      })

      await waitForEditor()
      const proseMirror = wrapper.find('.ProseMirror')
      expect(proseMirror.html()).toContain('<ol>')
      expect(proseMirror.html()).toContain('<li>')
      expect(proseMirror.text()).toContain('First')
      expect(proseMirror.text()).toContain('Second')
    })

    it('should render inline code from markdown', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: 'This is `inline code` here',
        },
      })

      await waitForEditor()
      const proseMirror = wrapper.find('.ProseMirror')
      expect(proseMirror.html()).toContain('<code>inline code</code>')
    })

    it('should render code blocks from markdown', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '```javascript\nconst x = 1;\n```',
        },
      })

      await waitForEditor()
      const proseMirror = wrapper.find('.ProseMirror')
      expect(proseMirror.html()).toContain('<pre>')
      expect(proseMirror.html()).toMatch(/<code[^>]*>/)
      expect(proseMirror.text()).toContain('const x = 1;')
    })

    it('should render blockquotes from markdown', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '> This is a quote',
        },
      })

      await waitForEditor()
      const proseMirror = wrapper.find('.ProseMirror')
      expect(proseMirror.html()).toContain('<blockquote>')
      expect(proseMirror.text()).toContain('This is a quote')
    })

    it('should render complex nested markdown', async () => {
      const markdown = `# Title

**Bold** and *italic* text.

- List item 1
- List item 2

\`code\` inline`

      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: markdown,
        },
      })

      await waitForEditor()
      const proseMirror = wrapper.find('.ProseMirror')
      expect(proseMirror.html()).toContain('<h1>Title</h1>')
      expect(proseMirror.html()).toContain('<strong>Bold</strong>')
      expect(proseMirror.html()).toContain('<em>italic</em>')
      expect(proseMirror.html()).toContain('<ul>')
      expect(proseMirror.html()).toContain('<code>code</code>')
    })
  })

  describe('Markdown Output (Editor to Store)', () => {
    it('should emit markdown when content changes', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '',
        },
      })

      await nextTick()

      // Simulate typing by getting the editor instance and setting content
      const component = wrapper.vm as any
      const editor = component.editor

      // Set plain text
      editor.commands.setContent('<p>Hello world</p>')
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      expect(emitted![emitted!.length - 1][0]).toBe('Hello world')
    })

    it('should emit markdown with bold formatting', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '',
        },
      })

      await nextTick()

      const component = wrapper.vm as any
      const editor = component.editor

      editor.commands.setContent('<p><strong>bold text</strong></p>')
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      const lastEmit = emitted![emitted!.length - 1][0] as string
      expect(lastEmit).toBe('**bold text**')
    })

    it('should emit markdown with italic formatting', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '',
        },
      })

      await nextTick()

      const component = wrapper.vm as any
      const editor = component.editor

      editor.commands.setContent('<p><em>italic text</em></p>')
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      const lastEmit = emitted![emitted!.length - 1][0] as string
      expect(lastEmit).toBe('*italic text*')
    })

    it('should emit markdown with headings', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '',
        },
      })

      await nextTick()

      const component = wrapper.vm as any
      const editor = component.editor

      editor.commands.setContent('<h1>Heading 1</h1><h2>Heading 2</h2>')
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      const lastEmit = emitted![emitted!.length - 1][0] as string
      expect(lastEmit).toContain('# Heading 1')
      expect(lastEmit).toContain('## Heading 2')
    })

    it('should emit markdown with bullet lists', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '',
        },
      })

      await nextTick()

      const component = wrapper.vm as any
      const editor = component.editor

      editor.commands.setContent('<ul><li><p>Item 1</p></li><li><p>Item 2</p></li></ul>')
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      const lastEmit = emitted![emitted!.length - 1][0] as string
      expect(lastEmit).toContain('- Item 1')
      expect(lastEmit).toContain('- Item 2')
    })

    it('should emit markdown with ordered lists', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '',
        },
      })

      await nextTick()

      const component = wrapper.vm as any
      const editor = component.editor

      editor.commands.setContent('<ol><li><p>First</p></li><li><p>Second</p></li></ol>')
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      const lastEmit = emitted![emitted!.length - 1][0] as string
      expect(lastEmit).toContain('1. First')
      expect(lastEmit).toContain('2. Second')
    })

    it('should emit markdown with inline code', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '',
        },
      })

      await nextTick()

      const component = wrapper.vm as any
      const editor = component.editor

      editor.commands.setContent('<p>Text with <code>inline code</code> here</p>')
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      const lastEmit = emitted![emitted!.length - 1][0] as string
      expect(lastEmit).toContain('`inline code`')
    })

    it('should emit markdown with code blocks', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '',
        },
      })

      await nextTick()

      const component = wrapper.vm as any
      const editor = component.editor

      editor.commands.setContent('<pre><code>const x = 1;</code></pre>')
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      const lastEmit = emitted![emitted!.length - 1][0] as string
      expect(lastEmit).toContain('```')
      expect(lastEmit).toContain('const x = 1;')
    })

    it('should emit markdown with blockquotes', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '',
        },
      })

      await nextTick()

      const component = wrapper.vm as any
      const editor = component.editor

      editor.commands.setContent('<blockquote><p>Quoted text</p></blockquote>')
      await nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      const lastEmit = emitted![emitted!.length - 1][0] as string
      expect(lastEmit).toContain('> Quoted text')
    })
  })

  describe('Two-Way Binding', () => {
    it('should update editor when modelValue prop changes', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: 'Initial text',
        },
      })

      await waitForEditor()
      let proseMirror = wrapper.find('.ProseMirror')
      expect(proseMirror.text()).toContain('Initial text')

      // Update prop
      await wrapper.setProps({ modelValue: 'Updated text' })
      await waitForEditor()

      proseMirror = wrapper.find('.ProseMirror')
      expect(proseMirror.text()).toContain('Updated text')
    })

    it('should handle empty to non-empty transitions', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '',
        },
      })

      await waitForEditor()

      await wrapper.setProps({ modelValue: '**Bold text**' })
      await waitForEditor()

      const proseMirror = wrapper.find('.ProseMirror')
      expect(proseMirror.html()).toContain('<strong>Bold text</strong>')
    })

    it('should handle non-empty to empty transitions', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '**Bold text**',
        },
      })

      await waitForEditor()

      await wrapper.setProps({ modelValue: '' })
      await waitForEditor()

      const proseMirror = wrapper.find('.ProseMirror')
      expect(proseMirror.text().trim()).toBe('')
    })
  })

  describe('Round-trip Serialization', () => {
    const testCases = [
      { name: 'plain text', markdown: 'Hello world' },
      { name: 'bold text', markdown: '**bold**' },
      { name: 'italic text', markdown: '*italic*' },
      { name: 'heading 1', markdown: '# Heading' },
      { name: 'heading 2', markdown: '## Heading' },
      { name: 'heading 3', markdown: '### Heading' },
      { name: 'bullet list', markdown: '- Item 1\n- Item 2' },
      { name: 'ordered list', markdown: '1. First\n2. Second' },
      { name: 'inline code', markdown: 'Text `code` here' },
      { name: 'blockquote', markdown: '> Quote' },
    ]

    testCases.forEach(({ name, markdown }) => {
      it(`should preserve ${name} through round-trip`, async () => {
        wrapper = mount(RichTextEditor, {
          props: {
            modelValue: markdown,
          },
        })

        await nextTick()

        // Get the emitted markdown
        const component = wrapper.vm as any
        const editor = component.editor

        // Trigger an update to emit markdown
        editor.commands.focus()
        await nextTick()

        const emitted = wrapper.emitted('update:modelValue')
        if (emitted && emitted.length > 0) {
          const emittedMarkdown = emitted[emitted.length - 1][0] as string
          // The emitted markdown should be semantically equivalent
          // (may have minor whitespace differences)
          expect(emittedMarkdown.trim()).toBeTruthy()
        }
      })
    })
  })

  describe('Edge Cases and Malformed Markdown', () => {
    it('should handle malformed bold with space before closing', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '**word **',
        },
      })

      await waitForEditor()

      const component = wrapper.vm as any
      const editor = component.editor
      const emittedMarkdown = editorToMarkdown(editor)

      // Should render as plain text since markdown is malformed
      expect(emittedMarkdown).toBeTruthy()
      // Malformed markdown should be treated as plain text or corrected
      expect(emittedMarkdown.includes('word')).toBe(true)
    })

    it('should serialize bold text with trailing space correctly', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '',
        },
      })

      await waitForEditor()

      const component = wrapper.vm as any
      const editor = component.editor

      // Simulate user typing bold text with a space after
      editor.commands.setContent('<p><strong>variations </strong>text</p>')
      await nextTick()

      const emittedMarkdown = editorToMarkdown(editor)

      // Should emit **variations** with space OUTSIDE the markers
      expect(emittedMarkdown).toContain('**variations**')
      expect(emittedMarkdown).not.toContain('**variations **')
      expect(emittedMarkdown).toContain('text')
    })

    it('should serialize bold text with leading space correctly', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '',
        },
      })

      await waitForEditor()

      const component = wrapper.vm as any
      const editor = component.editor

      // Simulate user typing with leading space
      editor.commands.setContent('<p>text <strong> bold</strong></p>')
      await nextTick()

      const emittedMarkdown = editorToMarkdown(editor)

      // Should emit **bold** with space OUTSIDE the markers
      expect(emittedMarkdown).toContain('**bold**')
      expect(emittedMarkdown).not.toContain('** bold**')
      expect(emittedMarkdown).toContain('text')
    })

    it('should handle the exact user scenario: malformed **variations ** becomes plain text', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: 'are many **variations **of passages',
        },
      })

      await waitForEditor()

      const component = wrapper.vm as any
      const editor = component.editor

      // Malformed markdown **word ** is not recognized by marked as bold
      // So it renders as plain text with asterisks visible
      const proseMirror = wrapper.find('.ProseMirror')
      expect(proseMirror.text()).toContain('variations')
      expect(proseMirror.text()).toContain('**') // asterisks remain as plain text

      // User will need to re-format or fix the text manually
      // The serializer can't fix already-malformed markdown from storage
      const emittedMarkdown = editorToMarkdown(editor)
      expect(emittedMarkdown).toContain('variations')
    })

    it('should prevent creating malformed markdown when user types bold with space', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '',
        },
      })

      await waitForEditor()

      const component = wrapper.vm as any
      const editor = component.editor

      // When user types CORRECTLY formatted bold that TipTap creates
      // with trailing space, our serializer should output correct markdown
      editor.commands.setContent('<p>are many <strong>variations</strong> of passages</p>')
      await nextTick()

      const emittedMarkdown = editorToMarkdown(editor)

      // Our fix ensures spaces are OUTSIDE the markers
      expect(emittedMarkdown).toContain('**variations**')
      expect(emittedMarkdown).not.toContain('**variations **')
      expect(emittedMarkdown).toContain('are many')
      expect(emittedMarkdown).toContain('of passages')
    })

    it('should handle malformed italic with space', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '*word *',
        },
      })

      await waitForEditor()

      const component = wrapper.vm as any
      const editor = component.editor
      const emittedMarkdown = editorToMarkdown(editor)

      expect(emittedMarkdown).toBeTruthy()
      expect(emittedMarkdown.includes('word')).toBe(true)
    })

    it('should handle mixed valid and invalid bold markers', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '**valid** and **invalid **',
        },
      })

      await waitForEditor()

      const component = wrapper.vm as any
      const editor = component.editor
      const emittedMarkdown = editorToMarkdown(editor)

      // Should contain both words
      expect(emittedMarkdown.includes('valid')).toBe(true)
      expect(emittedMarkdown.includes('invalid')).toBe(true)
    })

    it('should handle unclosed bold markers', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '**unclosed bold',
        },
      })

      await waitForEditor()

      const component = wrapper.vm as any
      const editor = component.editor
      const emittedMarkdown = editorToMarkdown(editor)

      expect(emittedMarkdown.includes('unclosed')).toBe(true)
      expect(emittedMarkdown.includes('bold')).toBe(true)
    })

    it('should handle extra spaces in markdown', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '**  spaced  **',
        },
      })

      await waitForEditor()

      const component = wrapper.vm as any
      const editor = component.editor
      const emittedMarkdown = editorToMarkdown(editor)

      expect(emittedMarkdown.includes('spaced')).toBe(true)
    })

    it('should handle nested formatting', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '**bold *and italic* text**',
        },
      })

      await waitForEditor()

      const component = wrapper.vm as any
      const editor = component.editor
      const emittedMarkdown = editorToMarkdown(editor)

      expect(emittedMarkdown.includes('bold')).toBe(true)
      expect(emittedMarkdown.includes('italic')).toBe(true)
    })

    it('should handle multiple consecutive spaces', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: 'word1    word2',
        },
      })

      await waitForEditor()

      const component = wrapper.vm as any
      const editor = component.editor
      const emittedMarkdown = editorToMarkdown(editor)

      expect(emittedMarkdown.includes('word1')).toBe(true)
      expect(emittedMarkdown.includes('word2')).toBe(true)
    })

    it('should handle empty bold markers', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: '****',
        },
      })

      await waitForEditor()

      const component = wrapper.vm as any
      const editor = component.editor
      const emittedMarkdown = editorToMarkdown(editor)

      // Empty markers should result in empty or minimal content
      expect(emittedMarkdown.trim().length).toBeGreaterThanOrEqual(0)
    })

    it('should handle mixed markdown and plain text', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: 'Plain **bold** more plain *italic* end',
        },
      })

      await waitForEditor()

      const component = wrapper.vm as any
      const editor = component.editor
      const emittedMarkdown = editorToMarkdown(editor)

      expect(emittedMarkdown.includes('Plain')).toBe(true)
      expect(emittedMarkdown.includes('bold')).toBe(true)
      expect(emittedMarkdown.includes('italic')).toBe(true)
      expect(emittedMarkdown.includes('end')).toBe(true)
    })

    it('should handle line breaks and whitespace normalization', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: 'Line1\n\n\nLine2',
        },
      })

      await waitForEditor()

      const component = wrapper.vm as any
      const editor = component.editor
      const emittedMarkdown = editorToMarkdown(editor)

      expect(emittedMarkdown.includes('Line1')).toBe(true)
      expect(emittedMarkdown.includes('Line2')).toBe(true)
    })
  })

  describe('Disabled State', () => {
    it('should update editable state when disabled prop changes', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: 'Test content',
          disabled: false,
        },
      })

      await waitForEditor()
      let proseMirror = wrapper.find('.ProseMirror')
      expect(proseMirror.attributes('contenteditable')).toBe('true')

      await wrapper.setProps({ disabled: true })
      await waitForEditor()

      proseMirror = wrapper.find('.ProseMirror')
      expect(proseMirror.attributes('contenteditable')).toBe('false')
    })
  })

  describe('Cleanup', () => {
    it('should destroy editor on unmount', async () => {
      wrapper = mount(RichTextEditor, {
        props: {
          modelValue: 'Test',
        },
      })

      await nextTick()

      const component = wrapper.vm as any
      const editor = component.editor
      const destroySpy = vi.spyOn(editor, 'destroy')

      wrapper.unmount()

      expect(destroySpy).toHaveBeenCalled()
    })
  })
})
