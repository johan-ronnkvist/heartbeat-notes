<template>
  <button
    v-if="clickable"
    :class="['week-rect', sizeClass, { current, disabled, clickable }]"
    :style="{ backgroundColor: color }"
    @click="handleClick"
    :disabled="disabled"
  >
    <span v-if="emoji" class="rect-emoji">{{ emoji }}</span>
    <span v-else-if="!hideWeekNumber" class="rect-number">{{ week }}</span>
    <div v-if="tooltipText" class="week-tooltip">{{ tooltipText }}</div>
  </button>
  <div v-else :class="['week-rect', sizeClass]" :style="{ backgroundColor: color }">
    <span v-if="emoji" class="rect-emoji">{{ emoji }}</span>
    <span v-else-if="!hideWeekNumber" class="rect-number">{{ week }}</span>
    <span v-if="label" class="rect-label">{{ label }}</span>
    <div v-if="tooltipText" class="week-tooltip">{{ tooltipText }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { EMOJI_SCALE, WEEK_STATUS_EMOJIS } from '@/constants/sentiment'
import type { WeeklyData } from '@/utils/db'

interface Props {
  // Option 1: Pass WeeklyData object directly (preferred, encapsulates logic)
  weekData?: WeeklyData | null

  // Option 2: Legacy - pass individual props (for backward compatibility)
  week?: number
  emoji?: string
  color?: string
  sentimentLabel?: string

  // Behavior props
  clickable?: boolean
  current?: boolean
  disabled?: boolean
  label?: string
  size?: 'small' | 'medium' | 'large'
  hideWeekNumber?: boolean
  year?: number
  showYearInTooltip?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  clickable: false,
  current: false,
  disabled: false,
  size: 'medium',
  hideWeekNumber: false,
  showYearInTooltip: false,
})

const emit = defineEmits<{
  click: []
}>()

const settingsStore = useSettingsStore()

// Computed emoji - from weekState or manual override
const emoji = computed(() => {
  // Manual override (legacy)
  if (props.emoji !== undefined) {
    return props.emoji
  }

  // From weekData object
  if (props.weekData?.weekState !== null && props.weekData?.weekState !== undefined) {
    const state = props.weekData.weekState
    // Check if it's a status string
    if (typeof state === 'string') {
      return WEEK_STATUS_EMOJIS[state as keyof typeof WEEK_STATUS_EMOJIS]
    }
    // Otherwise it's a sentiment number
    if (typeof state === 'number') {
      return EMOJI_SCALE[state - 1]
    }
  }

  return ''
})

// Computed color - neutral for status weeks, sentiment color otherwise
const color = computed(() => {
  // Manual override (legacy)
  if (props.color !== undefined) {
    return props.color
  }

  // From weekData object
  if (props.weekData?.weekState !== null && props.weekData?.weekState !== undefined) {
    const state = props.weekData.weekState
    // Status (string) gets neutral color
    if (typeof state === 'string') {
      return props.disabled ? '#f9fafb' : '#f3f4f6'
    }
    // Sentiment (number) gets color
    if (typeof state === 'number') {
      return settingsStore.colorSettings.colors[state - 1]
    }
  }

  // Default colors
  return props.disabled ? '#f9fafb' : '#f3f4f6'
})

// Computed week number
const week = computed(() => {
  if (props.week !== undefined) {
    return props.week
  }
  return props.weekData?.week
})

const sizeClass = computed(() => `size-${props.size}`)

const tooltipText = computed(() => {
  if (props.disabled) {
    return 'Future week'
  }
  if (props.label) {
    return props.label
  }
  if (week.value !== undefined) {
    return props.showYearInTooltip && props.year
      ? `${props.year} • ${week.value}`
      : `Week ${week.value}`
  }
  return ''
})

const handleClick = () => {
  if (!props.disabled && props.clickable) {
    emit('click')
  }
}
</script>

<style scoped>
.week-rect {
  aspect-ratio: 1;
  border-radius: 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(0, 0, 0, 0.1);
  position: relative;
  transition: all 0.2s;
}

/* Clickable state */
.week-rect.clickable {
  cursor: pointer;
  border: 2px solid rgba(0, 0, 0, 0.1);
  padding: 0;
  font-family: inherit;
}

.week-rect.clickable:hover:not(.disabled) {
  box-shadow:
    inset 0 0 0 2px var(--color-theme-primary),
    0 0 0 3px rgba(220, 38, 38, 0.1);
  border-color: transparent;
}

.week-rect.clickable.current {
  box-shadow: inset 0 0 0 3px var(--color-success);
  border-color: transparent;
}

.week-rect.clickable.disabled {
  opacity: 0.3;
  cursor: not-allowed;
  background: #f9fafb;
}

/* Non-clickable (preview) state */
.week-rect:not(.clickable) {
  gap: 0.25rem;
}

/* Size variants */
.week-rect.size-small {
  width: 2rem;
  height: 2rem;
}

.week-rect.size-small .rect-emoji {
  font-size: 1rem;
}

.week-rect.size-small .rect-number {
  font-size: 0.625rem;
}

.week-rect.size-medium {
  /* Uses aspect-ratio, so size is determined by grid/flex container */
}

.week-rect.size-medium .rect-emoji {
  font-size: clamp(1rem, 2vw, 2rem);
}

.week-rect.size-medium .rect-number {
  font-size: 0.7rem;
}

.week-rect.size-large {
  width: 4rem;
  height: 4rem;
}

.week-rect.size-large .rect-emoji {
  font-size: 2rem;
}

.week-rect.size-large .rect-number {
  font-size: 0.875rem;
}

/* Content */
.rect-emoji {
  display: inline-block;
}

.rect-number {
  font-weight: 500;
  color: #6b7280;
}

.rect-label {
  font-size: 0.75rem;
  color: #6b7280;
  text-align: center;
  margin-top: 0.25rem;
}

/* Tooltip */
.week-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: #1f2937;
  color: white;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  margin-bottom: 0.5rem;
  transition: opacity 0s;
  z-index: 10;
}

.week-rect:hover .week-tooltip {
  opacity: 1;
}

/* Responsive for clickable medium size */
@media (max-width: 1024px) {
  .week-rect.size-medium.clickable .rect-emoji {
    font-size: clamp(0.875rem, 1.75vw, 1.75rem);
  }
}

@media (max-width: 768px) {
  .week-rect.size-medium.clickable .rect-emoji {
    font-size: 1rem;
  }
}
</style>
