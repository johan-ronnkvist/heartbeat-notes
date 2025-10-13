<template>
  <div class="rich-text-editor">
    <!-- Desktop Toolbar -->
    <div v-if="editor && !disabled" class="toolbar desktop-toolbar">
      <button
        type="button"
        @click="editor.chain().focus().toggleBold().run()"
        :class="{ 'is-active': editor.isActive('bold') }"
        class="toolbar-button"
        title="Bold (Ctrl+B)"
      >
        <Bold class="toolbar-icon" />
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleItalic().run()"
        :class="{ 'is-active': editor.isActive('italic') }"
        class="toolbar-button"
        title="Italic (Ctrl+I)"
      >
        <Italic class="toolbar-icon" />
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleStrike().run()"
        :class="{ 'is-active': editor.isActive('strike') }"
        class="toolbar-button"
        title="Strikethrough"
      >
        <Strikethrough class="toolbar-icon" />
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleCode().run()"
        :class="{ 'is-active': editor.isActive('code') }"
        class="toolbar-button"
        title="Inline Code"
      >
        <Code class="toolbar-icon" />
      </button>
      <div class="toolbar-divider"></div>
      <button
        type="button"
        @click="editor.chain().focus().toggleBulletList().run()"
        :class="{ 'is-active': editor.isActive('bulletList') }"
        class="toolbar-button"
        title="Bullet List"
      >
        <List class="toolbar-icon" />
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleOrderedList().run()"
        :class="{ 'is-active': editor.isActive('orderedList') }"
        class="toolbar-button"
        title="Numbered List"
      >
        <ListOrdered class="toolbar-icon" />
      </button>
      <div class="toolbar-divider"></div>
      <button
        type="button"
        @click="editor.chain().focus().toggleBlockquote().run()"
        :class="{ 'is-active': editor.isActive('blockquote') }"
        class="toolbar-button"
        title="Blockquote"
      >
        <TextQuote class="toolbar-icon" />
      </button>
    </div>

    <!-- Mobile Toolbar -->
    <div v-if="editor && !disabled" class="toolbar mobile-toolbar">
      <button
        type="button"
        @click="editor.chain().focus().toggleBold().run()"
        :class="{ 'is-active': editor.isActive('bold') }"
        class="toolbar-button"
        title="Bold"
      >
        <Bold class="toolbar-icon" />
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleItalic().run()"
        :class="{ 'is-active': editor.isActive('italic') }"
        class="toolbar-button"
        title="Italic"
      >
        <Italic class="toolbar-icon" />
      </button>
      <button
        type="button"
        @click="editor.chain().focus().toggleStrike().run()"
        :class="{ 'is-active': editor.isActive('strike') }"
        class="toolbar-button"
        title="Strikethrough"
      >
        <Strikethrough class="toolbar-icon" />
      </button>
      <button
        type="button"
        @click="showMoreControls = !showMoreControls"
        class="toolbar-button more-button"
        :class="{ 'is-active': showMoreControls }"
        title="More options"
      >
        <MoreHorizontal class="toolbar-icon" />
      </button>

      <!-- Expandable More Controls -->
      <div v-if="showMoreControls" class="more-controls">
        <button
          type="button"
          @click="editor.chain().focus().toggleCode().run()"
          :class="{ 'is-active': editor.isActive('code') }"
          class="toolbar-button"
          title="Inline Code"
        >
          <Code class="toolbar-icon" />
        </button>
        <button
          type="button"
          @click="editor.chain().focus().toggleBulletList().run()"
          :class="{ 'is-active': editor.isActive('bulletList') }"
          class="toolbar-button"
          title="Bullet List"
        >
          <List class="toolbar-icon" />
        </button>
        <button
          type="button"
          @click="editor.chain().focus().toggleOrderedList().run()"
          :class="{ 'is-active': editor.isActive('orderedList') }"
          class="toolbar-button"
          title="Numbered List"
        >
          <ListOrdered class="toolbar-icon" />
        </button>
        <button
          type="button"
          @click="editor.chain().focus().toggleBlockquote().run()"
          :class="{ 'is-active': editor.isActive('blockquote') }"
          class="toolbar-button"
          title="Blockquote"
        >
          <TextQuote class="toolbar-icon" />
        </button>
      </div>
    </div>

    <editor-content :editor="editor" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  TextQuote,
  MoreHorizontal,
} from 'lucide-vue-next'
import { editorToMarkdown, renderMarkdown } from '@/utils/markdown'

// Mobile toolbar state
const showMoreControls = ref(false)

const props = defineProps<{
  modelValue: string
  placeholder?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      // Disable heading levels we don't need to reduce bundle size
      heading: {
        levels: [1, 2, 3],
      },
    }),
    Placeholder.configure({
      placeholder: props.placeholder || 'Start typing...',
    }),
    Typography, // Smart typography (quotes, arrows, etc.)
  ],
  content: props.modelValue ? renderMarkdown(props.modelValue) : '',
  editable: !props.disabled,
  onUpdate: ({ editor }) => {
    const markdown = editorToMarkdown(editor)
    emit('update:modelValue', markdown)
  },
})

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  (value) => {
    if (!editor.value) return

    // Get current content as markdown
    const currentMarkdown = editorToMarkdown(editor.value)

    // Only update if content actually changed
    if (currentMarkdown !== value) {
      // Convert markdown to HTML before setting
      const html = value ? renderMarkdown(value) : ''
      editor.value.commands.setContent(html)
    }
  },
)

// Watch for disabled state changes
watch(
  () => props.disabled,
  (disabled) => {
    editor.value?.setEditable(!disabled)
  },
)

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<style scoped>
.rich-text-editor {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  min-height: 150px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f9f9f9;
  border-radius: 4px 4px 0 0;
}

.toolbar-button {
  padding: 6px 10px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  transition: all 0.2s;
  min-width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toolbar-button:hover {
  background-color: #f0f0f0;
  border-color: #b0b0b0;
}

.toolbar-button.is-active {
  background-color: #e3f2fd;
  border-color: #2196f3;
  color: #1976d2;
}

.toolbar-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background-color: #d0d0d0;
  margin: 0 4px;
}

.toolbar-icon {
  width: 16px;
  height: 16px;
}

/* Desktop/Mobile toolbar visibility */
.desktop-toolbar {
  display: flex;
}

.mobile-toolbar {
  display: none;
}

/* Mobile toolbar styles */
.more-button {
  position: relative;
}

.more-controls {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  display: flex;
  gap: 4px;
  padding: 8px;
  background-color: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-top: none;
  z-index: 10;
}

@media (max-width: 768px) {
  .desktop-toolbar {
    display: none;
  }

  .mobile-toolbar {
    display: flex;
    flex-wrap: wrap;
    position: relative;
  }

  .toolbar-button {
    flex: 1;
    min-width: 44px;
    padding: 8px;
  }

  .more-controls {
    margin-top: 4px;
  }
}

@media (max-width: 480px) {
  .toolbar {
    padding: 6px;
    gap: 3px;
  }

  .toolbar-button {
    padding: 6px;
    min-width: 40px;
  }

  .toolbar-icon {
    width: 14px;
    height: 14px;
  }
}

:deep(.ProseMirror) {
  padding: 12px;
  outline: none;
  min-height: 150px;
}

:deep(.ProseMirror p.is-editor-empty:first-child::before) {
  color: #adb5bd;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

/* Basic Markdown styles */
:deep(.ProseMirror h1) {
  font-size: 2em;
  font-weight: bold;
  margin: 0.67em 0;
}

:deep(.ProseMirror h2) {
  font-size: 1.5em;
  font-weight: bold;
  margin: 0.75em 0;
}

:deep(.ProseMirror h3) {
  font-size: 1.17em;
  font-weight: bold;
  margin: 0.83em 0;
}

:deep(.ProseMirror ul),
:deep(.ProseMirror ol) {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

:deep(.ProseMirror code) {
  background-color: #f5f5f5;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.9em;
}

:deep(.ProseMirror pre) {
  background-color: #f5f5f5;
  padding: 1em;
  border-radius: 4px;
  overflow-x: auto;
}

:deep(.ProseMirror pre code) {
  background-color: transparent;
  padding: 0;
}

:deep(.ProseMirror blockquote) {
  border-left: 3px solid #e0e0e0;
  padding-left: 1em;
  margin-left: 0;
  color: #666;
}

:deep(.ProseMirror strong) {
  font-weight: bold;
}

:deep(.ProseMirror em) {
  font-style: italic;
}
</style>
