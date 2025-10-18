<template>
  <div class="week-header-card">
    <div class="week-header">
      <!-- Navigation button (left) -->
      <button
        v-if="showNavigation"
        class="nav-button"
        @click="$emit('navigate-previous')"
        :title="navigationLabels?.previous || 'Previous week'"
      >
        <ChevronLeft class="nav-icon" />
      </button>

      <!-- Week info -->
      <div class="week-info">
        <button
          v-if="showDatePicker"
          class="week-selector-button"
          @click="openDatePicker"
          title="Navigate to week"
        >
          <div class="week-title-row">
            <h2 class="week-title">
              <span v-if="fiscalYear" class="fiscal-year">{{ fiscalYear }}</span>
              <span v-if="fiscalYear" class="separator">•</span>
              {{ weekTitle }}
            </h2>
            <ChevronDown class="dropdown-icon" />
            <!-- Lock/Unlock badge (for NotesView) -->
            <slot name="lock-badge"></slot>
          </div>
          <p class="week-period">{{ weekPeriod }}</p>
        </button>
        <div v-else class="week-display">
          <div class="week-title-row">
            <h2 class="week-title">
              <span v-if="fiscalYear" class="fiscal-year">{{ fiscalYear }}</span>
              <span v-if="fiscalYear" class="separator">•</span>
              {{ weekTitle }}
            </h2>
            <!-- Lock/Unlock badge (for NotesView) -->
            <slot name="lock-badge"></slot>
          </div>
          <p class="week-period">{{ weekPeriod }}</p>
        </div>
      </div>

      <!-- Action slot (for Home link or NotesView navigation) -->
      <slot name="action">
        <button
          v-if="showNavigation"
          class="nav-button"
          @click="$emit('navigate-next')"
          :disabled="disableNextNavigation"
          :class="{ disabled: disableNextNavigation }"
          :title="navigationLabels?.next || 'Next week'"
        >
          <ChevronRight class="nav-icon" />
        </button>
      </slot>
    </div>

    <!-- Week Status Display (when a special status is set) -->
    <div v-if="isWeekStatus" class="week-status-display">
      <button
        v-if="showWeekSettings"
        class="status-settings-button"
        @click="openWeekSettings"
        :disabled="sentimentDisabled"
        :class="{ disabled: sentimentDisabled }"
        title="Week settings"
      >
        <MoreVertical class="settings-icon" />
      </button>
      <div class="status-content">
        <span class="status-emoji">{{ WEEK_STATUS_EMOJIS[weekState as WeekStatus] }}</span>
        <span class="status-label">{{ getStatusLabel(weekState as WeekStatus) }}</span>
      </div>
    </div>

    <!-- Sentiment selector (when no special status) -->
    <div v-else class="sentiment-wrapper">
      <button
        v-if="showWeekSettings"
        class="sentiment-settings-button"
        @click="openWeekSettings"
        :disabled="sentimentDisabled"
        :class="{ disabled: sentimentDisabled }"
        title="Week settings"
      >
        <MoreVertical class="settings-icon" />
      </button>
      <SentimentSelector
        :model-value="weekStateSentiment"
        @update:model-value="$emit('update:week-state', $event)"
        :label="sentimentLabel"
        :colors="colors"
        :disabled="sentimentDisabled"
      />
    </div>

    <!-- Lock/Unlock slot -->
    <slot name="lock-status"></slot>

    <!-- Additional content slot (e.g., focus reminder) -->
    <slot name="additional-content"></slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight, ChevronDown, MoreVertical } from 'lucide-vue-next'
import SentimentSelector from './SentimentSelector.vue'
import { WEEK_STATUS_EMOJIS } from '@/constants/sentiment'
import type { WeekStatus, WeekState } from '@/utils/db'

interface Props {
  weekTitle: string
  weekPeriod: string
  fiscalYear?: string
  weekState?: WeekState
  sentimentLabel?: string
  colors: string[]
  sentimentDisabled?: boolean
  showNavigation?: boolean
  disableNextNavigation?: boolean
  navigationLabels?: {
    previous?: string
    next?: string
  }
  showDatePicker?: boolean
  showWeekSettings?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  sentimentLabel: 'How is this week going?',
  sentimentDisabled: false,
  showNavigation: false,
  disableNextNavigation: false,
  showDatePicker: false,
  showWeekSettings: false,
  weekState: null,
})

const emit = defineEmits<{
  'update:week-state': [value: WeekState]
  'navigate-previous': []
  'navigate-next': []
  'open-date-picker': []
  'open-week-settings': []
}>()

// Check if weekState is a status (string) or sentiment (number)
const isWeekStatus = computed(() => typeof props.weekState === 'string')

// Extract sentiment value for the selector (only when it's a number)
const weekStateSentiment = computed(() => {
  return typeof props.weekState === 'number' ? props.weekState : null
})

const openDatePicker = () => {
  emit('open-date-picker')
}

const openWeekSettings = () => {
  emit('open-week-settings')
}

const getStatusLabel = (status: WeekStatus): string => {
  const labels: Record<WeekStatus, string> = {
    vacation: 'On Vacation',
    sick: 'Sick Leave',
    other: 'Other',
  }
  return labels[status]
}
</script>

<style scoped>
.week-header-card {
  background: linear-gradient(to bottom, #ffffff, #f9fafb);
  border-radius: 0.75rem;
  padding: 2rem;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  margin-bottom: 2rem;
  border: 1px solid #e5e7eb;
}

.week-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
  gap: 1rem;
}

.nav-button {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: #6b7280;
  transition: color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
}

.nav-button:hover:not(.disabled) {
  color: #111827;
  background: #f3f4f6;
}

.nav-button.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.nav-icon {
  width: 1.5rem;
  height: 1.5rem;
}

.week-info {
  flex: 1;
  text-align: center;
}

.week-selector-button {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  width: 100%;
  text-align: center;
  transition: opacity 0.2s;
}

.week-selector-button:hover {
  opacity: 0.7;
}

.week-display {
  width: 100%;
}

.week-title-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.week-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.fiscal-year {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
}

.separator {
  font-size: 1.5rem;
  font-weight: 700;
  color: #6b7280;
}

.week-period {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.dropdown-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: #6b7280;
  flex-shrink: 0;
}

/* Week Status Display - Hero Element */
.week-status-display {
  position: relative;
  padding: 2rem 0 1rem;
}

.status-settings-button {
  position: absolute;
  top: 2rem;
  right: 0;
  background: white;
  border: 1px solid #d1d5db;
  padding: 0.5rem;
  cursor: pointer;
  color: #6b7280;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.status-settings-button:hover:not(.disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
  color: #111827;
}

.status-settings-button.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.settings-icon {
  width: 1.25rem;
  height: 1.25rem;
}

/* Sentiment Wrapper */
.sentiment-wrapper {
  position: relative;
  padding-top: 2rem;
}

.sentiment-settings-button {
  position: absolute;
  top: 2rem;
  right: 0;
  background: white;
  border: 1px solid #d1d5db;
  padding: 0.5rem;
  cursor: pointer;
  color: #6b7280;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 1;
}

.sentiment-settings-button:hover:not(.disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
  color: #111827;
}

.sentiment-settings-button.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.status-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 0;
  background: transparent;
}

.status-emoji {
  font-size: 4rem;
  line-height: 1;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.15));
}

.status-label {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.025em;
}

/* Responsive */
@media (max-width: 768px) {
  .week-header-card {
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .week-header {
    gap: 0.75rem;
    padding-bottom: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .week-info {
    text-align: center;
  }

  .week-title {
    font-size: 1.125rem;
  }

  .fiscal-year {
    font-size: 1.125rem;
  }

  .separator {
    font-size: 1.125rem;
  }

  .week-period {
    font-size: 0.8125rem;
  }

  .week-title-row {
    gap: 0.5rem;
  }

  .dropdown-icon {
    width: 1rem;
    height: 1rem;
  }

  .status-settings-button,
  .sentiment-settings-button {
    padding: 0.375rem;
  }

  .settings-icon {
    width: 1.125rem;
    height: 1.125rem;
  }

  .nav-button {
    padding: 0.375rem;
  }

  .nav-icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  .status-emoji {
    font-size: 3rem;
  }

  .status-label {
    font-size: 1.5rem;
  }

  .sentiment-wrapper,
  .week-status-display {
    padding-top: 1rem;
  }

  .status-settings-button {
    top: 1rem;
  }

  .sentiment-settings-button {
    top: 1rem;
  }

  .focus-reminder {
    padding: 0.75rem 1rem;
  }

  .reminder-title {
    font-size: 0.8125rem;
  }

  .reminder-text {
    font-size: 0.8125rem;
    padding-left: 1.5rem;
  }
}

/* Extra small mobile devices */
@media (max-width: 480px) {
  .week-header-card {
    padding: 0.75rem;
  }

  .week-header {
    gap: 0.5rem;
    padding-bottom: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .week-title {
    font-size: 1rem;
  }

  .fiscal-year {
    font-size: 1rem;
  }

  .separator {
    font-size: 1rem;
  }

  .week-period {
    font-size: 0.75rem;
  }

  .week-title-row {
    gap: 0.375rem;
    flex-wrap: wrap;
  }

  .status-content {
    gap: 1rem;
    flex-direction: column;
  }

  .status-emoji {
    font-size: 2.5rem;
  }

  .status-label {
    font-size: 1.25rem;
  }

  .focus-reminder {
    padding: 0.625rem 0.875rem;
  }

  .reminder-icon {
    font-size: 1.125rem;
  }

  .reminder-title {
    font-size: 0.75rem;
  }

  .reminder-text {
    font-size: 0.75rem;
    padding-left: 1.375rem;
  }
}
</style>
