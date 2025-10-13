<template>
  <div class="sentiment-section">
    <label v-if="label" class="sentiment-label">{{ label }}</label>

    <!-- Desktop: Cards with labels -->
    <div class="emoji-selector desktop-view">
      <button
        v-for="(emoji, index) in emojiScale"
        :key="index"
        type="button"
        @click="handleSelect(index + 1)"
        :class="['emoji-button', { active: modelValue === index + 1 }]"
        :style="{
          backgroundColor: modelValue === index + 1 ? colors[index] : 'white',
        }"
        :title="sentimentLabels[index]"
        :disabled="disabled"
      >
        <span class="emoji">{{ emoji }}</span>
        <span class="emoji-label">{{ sentimentLabels[index] }}</span>
      </button>
    </div>

    <!-- Mobile: Horizontal emoji line + label below -->
    <div class="mobile-view">
      <div class="emoji-line">
        <button
          v-for="(emoji, index) in emojiScale"
          :key="index"
          type="button"
          @click="handleSelect(index + 1)"
          :class="['emoji-circle', { active: modelValue === index + 1 }]"
          :style="{
            backgroundColor: modelValue === index + 1 ? colors[index] : 'white',
          }"
          :disabled="disabled"
        >
          <span class="emoji-icon">{{ emoji }}</span>
        </button>
      </div>
      <div v-if="modelValue" class="selected-label">
        {{ sentimentLabels[(modelValue as number) - 1] }}
      </div>
      <div v-else class="selected-label placeholder">Tap an emoji above</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { EMOJI_SCALE, SENTIMENT_LABELS } from '@/constants/sentiment'

const emojiScale = EMOJI_SCALE
const sentimentLabels = SENTIMENT_LABELS

interface Props {
  modelValue: number | null
  label?: string
  colors: string[]
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const handleSelect = (level: number) => {
  if (!props.disabled) {
    emit('update:modelValue', level)
  }
}
</script>

<style scoped>
.sentiment-section {
  padding-top: 0.75rem;
}

.sentiment-label {
  display: block;
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 1.25rem;
  text-align: center;
  letter-spacing: -0.02em;
}

.emoji-selector {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.emoji-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  flex: 1;
  max-width: 8rem;
}

.emoji-button:hover:not(:disabled) {
  border-color: #9ca3af;
  transform: scale(1.05);
}

.emoji-button.active {
  border-color: rgba(0, 0, 0, 0.2);
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
}

.emoji-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.emoji-button:disabled:hover {
  transform: none;
}

.emoji-button .emoji {
  font-size: 2.5rem;
}

.emoji-button .emoji-label {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
  font-size: 0.875rem;
  color: #374151;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.01em;
}

/* Mobile view - horizontal line layout */
.mobile-view {
  display: none;
}

.emoji-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.emoji-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.emoji-circle:hover:not(:disabled) {
  border-color: #9ca3af;
  transform: scale(1.1);
}

.emoji-circle.active {
  border-color: rgba(0, 0, 0, 0.2);
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
  transform: scale(1.15);
}

.emoji-circle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.emoji-circle:disabled:hover {
  transform: none;
}

.emoji-icon {
  font-size: 1.75rem;
  line-height: 1;
}

.selected-label {
  text-align: center;
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  min-height: 1.5rem;
}

.selected-label.placeholder {
  color: #9ca3af;
  font-weight: 400;
  font-size: 0.875rem;
}

/* Show/hide desktop vs mobile */
.desktop-view {
  display: flex;
}

@media (max-width: 768px) {
  .desktop-view {
    display: none;
  }

  .mobile-view {
    display: block;
  }

  .sentiment-label {
    font-size: 1rem;
    margin-bottom: 1rem;
  }
}

@media (max-width: 480px) {
  .emoji-circle {
    width: 2.5rem;
    height: 2.5rem;
  }

  .emoji-icon {
    font-size: 1.5rem;
  }

  .emoji-line {
    gap: 0.375rem;
  }

  .selected-label {
    font-size: 0.9375rem;
  }

  .selected-label.placeholder {
    font-size: 0.8125rem;
  }

  .sentiment-label {
    font-size: 0.9375rem;
    margin-bottom: 0.75rem;
  }
}
</style>
