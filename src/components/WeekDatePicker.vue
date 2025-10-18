<template>
  <div v-if="isOpen" class="date-picker-overlay" @click="close">
    <div class="date-picker-modal" @click.stop>
      <div class="date-picker-header">
        <h3 class="date-picker-title">Navigate to Week</h3>
        <button class="close-button" @click="close" title="Close">
          <X class="close-icon" />
        </button>
      </div>

      <!-- Year selector -->
      <div class="year-selector">
        <button class="year-nav-button" @click="previousYear" title="Previous year">
          <ChevronLeft class="year-nav-icon" />
        </button>
        <div class="year-display">{{ displayYear }}</div>
        <button
          class="year-nav-button"
          @click="nextYear"
          :disabled="!canGoNextYear"
          :class="{ disabled: !canGoNextYear }"
          title="Next year"
        >
          <ChevronRight class="year-nav-icon" />
        </button>
      </div>

      <!-- Desktop: Week grid (inspired by year at a glance) -->
      <div class="week-grid desktop-layout">
        <div v-for="quarter in 4" :key="`quarter-${quarter}`" class="quarter-section">
          <div class="quarter-label">Q{{ quarter }}</div>
          <div class="weeks-row">
            <WeekRect
              v-for="week in getQuarterWeeks(quarter)"
              :key="week"
              :week-data="getWeekData(week)"
              :week="week"
              :year="selectedYear"
              :show-year-in-tooltip="true"
              :clickable="canSelectWeek(week)"
              :current="isCurrentWeek(week)"
              :disabled="!canSelectWeek(week)"
              @click="navigateToWeek(week)"
            />
          </div>
        </div>
      </div>

      <!-- Mobile: Scrollable list of all weeks -->
      <div class="week-list mobile-layout">
        <div class="week-cards">
          <div
            v-for="week in allSelectableWeeks"
            :key="week"
            class="week-card"
            :class="{
              current: isCurrentWeek(week),
              disabled: !canSelectWeek(week),
            }"
            @click="navigateToWeek(week)"
          >
            <div class="week-card-content">
              <div class="week-card-number">Week {{ week }}</div>
              <div v-if="isCurrentWeek(week)" class="current-badge">Current</div>
            </div>
            <div
              class="week-card-emoji"
              :style="{
                backgroundColor: getWeekColor(week),
              }"
            >
              {{ getWeekEmoji(week) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { X, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useWeeklyStore } from '@/stores/weekly'
import { useSettingsStore } from '@/stores/settings'
import type { WeeklyData } from '@/utils/db'
import WeekRect from '@/components/WeekRect.vue'
import { EMOJI_SCALE, WEEK_STATUS_EMOJIS } from '@/constants/sentiment'

interface Props {
  isOpen: boolean
  currentYear: number
  currentWeek: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  navigate: [year: number, week: number]
}>()

const weeklyStore = useWeeklyStore()
const settingsStore = useSettingsStore()

const selectedYear = ref(props.currentYear)

// Map of week number to WeeklyData
const weeklyDataMap = ref<Map<number, WeeklyData>>(new Map())

// Always use calendar year for the date picker display
const displayYear = computed(() => {
  return selectedYear.value.toString()
})

// Get current calendar year/week for validation
function getCurrentCalendarWeek(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const diff = now.getTime() - start.getTime()
  const oneWeek = 1000 * 60 * 60 * 24 * 7
  return Math.ceil(diff / oneWeek)
}

const currentCalendarYear = new Date().getFullYear()
const currentCalendarWeek = getCurrentCalendarWeek()

// Check if we can navigate to next year
const canGoNextYear = computed(() => {
  return selectedYear.value < currentCalendarYear
})

// Get weeks for a quarter (always use calendar year layout)
const getQuarterWeeks = (quarter: number): number[] => {
  // Calendar year mode: simple sequential weeks
  const start = (quarter - 1) * 13 + 1
  return Array.from({ length: 13 }, (_, i) => start + i)
}

// Check if a week can be selected (only past and current weeks)
const canSelectWeek = (week: number): boolean => {
  if (selectedYear.value < currentCalendarYear) {
    return true // All weeks in past years are selectable
  }
  if (selectedYear.value === currentCalendarYear) {
    return week <= currentCalendarWeek // Only past and current weeks
  }
  return false // Future years not selectable
}

// Get week data for a week number
const getWeekData = (week: number): WeeklyData | null => {
  return weeklyDataMap.value.get(week) || null
}

// Check if week is the current week
const isCurrentWeek = (week: number): boolean => {
  return selectedYear.value === currentCalendarYear && week === currentCalendarWeek
}

// All selectable weeks (for mobile scrollable list)
const allSelectableWeeks = computed(() => {
  const maxWeek = selectedYear.value === currentCalendarYear ? currentCalendarWeek : 52
  const weeks: number[] = []
  for (let i = 1; i <= maxWeek; i++) {
    weeks.push(i)
  }
  return weeks.reverse() // Reverse so current week is at top
})

// Get emoji for a week (for mobile cards)
const getWeekEmoji = (week: number): string => {
  const weekData = weeklyDataMap.value.get(week)
  if (!weekData) return '📅'

  if (typeof weekData.weekState === 'string') {
    return WEEK_STATUS_EMOJIS[weekData.weekState as keyof typeof WEEK_STATUS_EMOJIS]
  } else if (typeof weekData.weekState === 'number') {
    return EMOJI_SCALE[weekData.weekState - 1]
  }
  return '📅'
}

// Get color for a week (for mobile card gradients)
const getWeekColor = (week: number): string => {
  const weekData = weeklyDataMap.value.get(week)
  if (!weekData || typeof weekData.weekState !== 'number') {
    return 'transparent'
  }
  return settingsStore.colorSettings.colors[weekData.weekState - 1] || 'transparent'
}

// Navigate to a week immediately
const navigateToWeek = (week: number) => {
  if (!canSelectWeek(week)) return
  emit('navigate', selectedYear.value, week)
  emit('close')
}

// Year navigation
const previousYear = () => {
  selectedYear.value--
  loadYearData()
}

const nextYear = () => {
  if (canGoNextYear.value) {
    selectedYear.value++
    loadYearData()
  }
}

// Close modal
const close = () => {
  emit('close')
}

// Load week data for the selected year (always calendar year)
const loadYearData = async () => {
  weeklyDataMap.value.clear()

  // Load all weeks for the year
  const weeks = await weeklyStore.loadYearWeeks(selectedYear.value)
  weeks.forEach((weekData) => {
    weeklyDataMap.value.set(weekData.week, weekData)
  })
}

// Watch for modal open/close
watch(
  () => props.isOpen,
  (newValue) => {
    if (newValue) {
      selectedYear.value = props.currentYear
      loadYearData()
    }
  },
)
</script>

<style scoped>
.date-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.date-picker-modal {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.date-picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.date-picker-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: #6b7280;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-button:hover {
  background: #f3f4f6;
  color: #111827;
}

.close-icon {
  width: 1.5rem;
  height: 1.5rem;
}

.year-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.75rem;
}

.year-nav-button {
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

.year-nav-button:hover:not(.disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
  color: #111827;
}

.year-nav-button.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.year-nav-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.year-display {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  min-width: 8rem;
  text-align: center;
}

.week-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.quarter-section {
  display: grid;
  grid-template-columns: 2rem 1fr;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  margin-bottom: 0.5rem;
}

.quarter-section:last-child {
  margin-bottom: 0;
}

.quarter-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  text-align: right;
}

.weeks-row {
  display: grid;
  grid-template-columns: repeat(13, minmax(0, 1fr));
  gap: 0.5rem;
  min-width: 0;
  overflow: visible;
}

/* Mobile scrollable list layout */
.week-list {
  display: none;
}

.week-cards {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 0.25rem;
}

/* Custom scrollbar styling */
.week-cards::-webkit-scrollbar {
  width: 6px;
}

.week-cards::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 3px;
}

.week-cards::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.week-cards::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.week-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  gap: 1rem;
}

.week-card:hover:not(.disabled) {
  border-color: #9ca3af;
  transform: translateX(4px);
}

.week-card.current {
  border-color: var(--color-theme-primary);
}

.week-card.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.week-card.disabled:hover {
  transform: none;
  border-color: #e5e7eb;
  background: white;
}

.week-card-content {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  flex: 1;
}

.week-card-number {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.week-card-emoji {
  font-size: 2rem;
  line-height: 1;
  flex-shrink: 0;
  padding: 0.75rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 3.5rem;
  min-height: 3.5rem;
  border: 2px solid rgba(0, 0, 0, 0.1);
}

.current-badge {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--color-theme-primary);
  background: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid var(--color-theme-primary);
  width: fit-content;
}

/* Desktop layout visible by default */
.desktop-layout {
  display: block;
}

.mobile-layout {
  display: none;
}

@media (max-width: 768px) {
  .date-picker-overlay {
    padding: 0.5rem;
    align-items: flex-start;
  }

  .date-picker-modal {
    padding: 1rem;
    max-height: 95vh;
    border-radius: 0.75rem;
    margin-top: 1rem;
  }

  .date-picker-header {
    margin-bottom: 1rem;
  }

  .date-picker-title {
    font-size: 1.125rem;
  }

  .close-icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  .year-selector {
    padding: 0.75rem;
    margin-bottom: 1.5rem;
    gap: 0.75rem;
  }

  .year-display {
    font-size: 1.125rem;
    min-width: 5rem;
  }

  .year-nav-button {
    padding: 0.375rem;
  }

  .year-nav-icon {
    width: 1.125rem;
    height: 1.125rem;
  }

  /* Hide desktop layout, show mobile sliding window */
  .desktop-layout {
    display: none;
  }

  .mobile-layout {
    display: block;
  }

  .week-card {
    padding: 0.625rem 0.875rem;
  }

  .week-card-number {
    font-size: 0.8125rem;
  }

  .week-card-emoji {
    font-size: 1.375rem;
    min-width: 2.5rem;
    min-height: 2.5rem;
    padding: 0.375rem;
  }

  .week-cards {
    max-height: 55vh;
    gap: 0.5rem;
  }
}

@media (max-width: 480px) {
  .date-picker-overlay {
    padding: 0.25rem;
    align-items: flex-start;
  }

  .date-picker-modal {
    padding: 0.75rem;
    margin-top: 0.5rem;
  }

  .date-picker-header {
    margin-bottom: 0.75rem;
  }

  .date-picker-title {
    font-size: 1rem;
  }

  .close-button {
    padding: 0.375rem;
  }

  .close-icon {
    width: 1.125rem;
    height: 1.125rem;
  }

  .year-selector {
    padding: 0.625rem;
    margin-bottom: 1rem;
    gap: 0.5rem;
  }

  .year-display {
    font-size: 1rem;
    min-width: 4rem;
  }

  .week-cards {
    gap: 0.375rem;
    max-height: 65vh;
  }

  .week-card {
    padding: 0.5rem 0.75rem;
  }

  .week-card-number {
    font-size: 0.75rem;
  }

  .week-card-emoji {
    font-size: 1.25rem;
    min-width: 2.25rem;
    min-height: 2.25rem;
    padding: 0.375rem;
  }

  .current-badge {
    font-size: 0.5625rem;
    padding: 0.125rem 0.3125rem;
  }
}
</style>
