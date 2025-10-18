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

    <!-- Mobile: Swipe-based UI with large selected emoji -->
    <div
      class="mobile-view"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <div class="large-emoji-container">
        <button
          v-if="modelValue && modelValue > 1"
          class="swipe-arrow swipe-arrow-left"
          :class="{ visible: modelValue && modelValue > 1 }"
          @click="handleArrowClick('left')"
          :disabled="disabled"
          type="button"
        >
          ←
        </button>

        <!-- Previous emoji (exiting) -->
        <div
          v-if="isTransitioning && previousValue"
          class="large-emoji-display exiting"
          :class="{
            'exit-left': swipeDirection === 'left',
            'exit-right': swipeDirection === 'right',
          }"
          :style="{
            backgroundColor: colors[(previousValue as number) - 1],
          }"
        >
          <span class="large-emoji">{{ emojiScale[(previousValue as number) - 1] }}</span>
        </div>

        <!-- Current emoji (entering or static) -->
        <div
          v-if="modelValue && !isTransitioning"
          class="large-emoji-display"
          :style="{
            backgroundColor: colors[(modelValue as number) - 1],
          }"
        >
          <span class="large-emoji">{{ emojiScale[(modelValue as number) - 1] }}</span>
        </div>

        <!-- New emoji (entering) -->
        <div
          v-if="isTransitioning && modelValue"
          class="large-emoji-display entering"
          :class="{
            'enter-from-left': swipeDirection === 'right',
            'enter-from-right': swipeDirection === 'left',
          }"
          :style="{
            backgroundColor: colors[(modelValue as number) - 1],
          }"
        >
          <span class="large-emoji">{{ emojiScale[(modelValue as number) - 1] }}</span>
        </div>

        <div v-if="!modelValue && !isTransitioning" class="large-emoji-placeholder">
          <span class="placeholder-text">← Swipe or tap →</span>
        </div>

        <button
          v-if="modelValue && modelValue < emojiScale.length"
          class="swipe-arrow swipe-arrow-right"
          :class="{ visible: modelValue && modelValue < emojiScale.length }"
          @click="handleArrowClick('right')"
          :disabled="disabled"
          type="button"
        >
          →
        </button>
      </div>

      <div v-if="modelValue" class="selected-label">
        {{ sentimentLabels[(modelValue as number) - 1] }}
      </div>
      <div v-else class="selected-label placeholder">Choose your mood</div>

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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
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

// Touch gesture handling
const touchStartX = ref<number>(0)
const touchStartY = ref<number>(0)
const swipeDirection = ref<'left' | 'right' | null>(null)
const isTransitioning = ref<boolean>(false)
const previousValue = ref<number | null>(null)
const SWIPE_THRESHOLD = 50 // minimum distance for swipe

const handleTouchStart = (event: TouchEvent) => {
  if (props.disabled) return
  touchStartX.value = event.touches[0].clientX
  touchStartY.value = event.touches[0].clientY
}

const handleTouchMove = (event: TouchEvent) => {
  // Prevent default to avoid scrolling during horizontal swipes
  const touchEndX = event.touches[0].clientX
  const touchEndY = event.touches[0].clientY
  const deltaX = Math.abs(touchEndX - touchStartX.value)
  const deltaY = Math.abs(touchEndY - touchStartY.value)

  // If horizontal movement is greater than vertical, prevent default to stop scrolling
  if (deltaX > deltaY) {
    event.preventDefault()
  }
}

const handleTouchEnd = (event: TouchEvent) => {
  if (props.disabled || isTransitioning.value) return

  const touchEndX = event.changedTouches[0].clientX
  const touchEndY = event.changedTouches[0].clientY
  const deltaX = touchEndX - touchStartX.value
  const deltaY = touchEndY - touchStartY.value

  // Check if it's a horizontal swipe (not vertical)
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
    const currentValue = props.modelValue || 3 // Default to middle (3) if no selection

    if (deltaX > 0) {
      // Swipe right - decrease sentiment
      const newValue = Math.max(currentValue - 1, 1)
      if (newValue !== currentValue) {
        performSwipeTransition('right', newValue)
      }
    } else {
      // Swipe left - increase sentiment
      const newValue = Math.min(currentValue + 1, emojiScale.length)
      if (newValue !== currentValue) {
        performSwipeTransition('left', newValue)
      }
    }
  }
}

const performSwipeTransition = (direction: 'left' | 'right', newValue: number) => {
  isTransitioning.value = true
  previousValue.value = props.modelValue
  swipeDirection.value = direction

  // Wait for exit animation
  setTimeout(() => {
    handleSelect(newValue)
    // Wait for enter animation
    setTimeout(() => {
      isTransitioning.value = false
      swipeDirection.value = null
      previousValue.value = null
    }, 100)
  }, 100)
}

const handleArrowClick = (direction: 'left' | 'right') => {
  if (props.disabled || isTransitioning.value || !props.modelValue) return

  const currentValue = props.modelValue

  if (direction === 'left') {
    // Left arrow - decrease sentiment
    const newValue = Math.max(currentValue - 1, 1)
    if (newValue !== currentValue) {
      performSwipeTransition('right', newValue)
    }
  } else {
    // Right arrow - increase sentiment
    const newValue = Math.min(currentValue + 1, emojiScale.length)
    if (newValue !== currentValue) {
      performSwipeTransition('left', newValue)
    }
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

/* Mobile view - swipe-based layout */
.mobile-view {
  display: none;
  touch-action: pan-y; /* Allow vertical scrolling, handle horizontal in JS */
}

.large-emoji-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1rem;
  min-height: 10rem;
  position: relative;
}

.swipe-arrow {
  font-size: 2.5rem;
  color: #d1d5db;
  user-select: none;
  position: absolute;
  opacity: 0;
  transition: all 0.3s ease;
  animation: pulse-arrow 2s ease-in-out infinite;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.swipe-arrow:disabled {
  cursor: not-allowed;
}

.swipe-arrow:active:not(:disabled) {
  transform: scale(1.2);
}

.swipe-arrow.visible {
  opacity: 0.4;
}

.swipe-arrow.visible:hover:not(:disabled) {
  opacity: 0.8;
}

.swipe-arrow-left {
  left: 0;
}

.swipe-arrow-right {
  right: 0;
}

@keyframes pulse-arrow {
  0%,
  100% {
    opacity: 0.2;
  }
  50% {
    opacity: 0.6;
  }
}

.large-emoji-display {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 9rem;
  height: 9rem;
  border-radius: 1.5rem;
  border: 3px solid rgba(0, 0, 0, 0.15);
  box-shadow:
    0 10px 25px rgba(0, 0, 0, 0.1),
    0 4px 6px rgba(0, 0, 0, 0.05);
}

.large-emoji-display.exiting,
.large-emoji-display.entering {
  position: absolute;
}

/* Exit animations */
.large-emoji-display.exit-left {
  animation: exitToLeft 0.1s ease forwards;
}

.large-emoji-display.exit-right {
  animation: exitToRight 0.1s ease forwards;
}

/* Enter animations */
.large-emoji-display.enter-from-left {
  animation: enterFromLeft 0.1s ease forwards;
}

.large-emoji-display.enter-from-right {
  animation: enterFromRight 0.1s ease forwards;
}

/* Exit to left (swiped left) */
@keyframes exitToLeft {
  0% {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateX(-150px) scale(0.7);
    opacity: 0;
  }
}

/* Exit to right (swiped right) */
@keyframes exitToRight {
  0% {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateX(150px) scale(0.7);
    opacity: 0;
  }
}

/* Enter from left (swiped right, so new item comes from left) */
@keyframes enterFromLeft {
  0% {
    transform: translateX(-150px) scale(0.7);
    opacity: 0;
  }
  100% {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
}

/* Enter from right (swiped left, so new item comes from right) */
@keyframes enterFromRight {
  0% {
    transform: translateX(150px) scale(0.7);
    opacity: 0;
  }
  100% {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
}

.large-emoji {
  font-size: 5rem;
  line-height: 1;
  user-select: none;
}

.large-emoji-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 9rem;
  height: 9rem;
  border-radius: 1.5rem;
  border: 3px dashed #d1d5db;
  background-color: #f9fafb;
}

.placeholder-text {
  font-size: 0.875rem;
  color: #9ca3af;
  font-weight: 500;
  text-align: center;
  padding: 0 1rem;
}

.selected-label {
  text-align: center;
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
  min-height: 1.75rem;
  margin-bottom: 1.5rem;
  transition: all 0.2s ease;
}

.selected-label.placeholder {
  color: #9ca3af;
  font-weight: 500;
  font-size: 0.9375rem;
}

.emoji-line {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.625rem;
}

.emoji-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
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
  border-color: rgba(0, 0, 0, 0.3);
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.15);
  transform: scale(1.2);
}

.emoji-circle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.emoji-circle:disabled:hover {
  transform: none;
}

.emoji-icon {
  font-size: 1.5rem;
  line-height: 1;
  user-select: none;
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
  .large-emoji-container {
    min-height: 8rem;
  }

  .swipe-arrow {
    font-size: 2rem;
  }

  .large-emoji-display {
    width: 7.5rem;
    height: 7.5rem;
    border-radius: 1.25rem;
  }

  .large-emoji {
    font-size: 4rem;
  }

  .large-emoji-placeholder {
    width: 7.5rem;
    height: 7.5rem;
    border-radius: 1.25rem;
  }

  .placeholder-text {
    font-size: 0.8125rem;
  }

  .selected-label {
    font-size: 1rem;
    margin-bottom: 1.25rem;
  }

  .selected-label.placeholder {
    font-size: 0.875rem;
  }

  .emoji-circle {
    width: 2.25rem;
    height: 2.25rem;
  }

  .emoji-icon {
    font-size: 1.25rem;
  }

  .emoji-line {
    gap: 0.5rem;
  }

  .sentiment-label {
    font-size: 0.9375rem;
    margin-bottom: 0.75rem;
  }
}
</style>
