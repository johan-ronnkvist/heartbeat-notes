<template>
  <div class="review">
    <!-- Yearly Sentiment Overview -->
    <div class="sentiment-overview">
      <div class="overview-header">
        <h2 class="section-title">
          <span class="title-full">{{ displayYear }} at a Glance</span>
          <span class="title-short">{{ displayYear }}</span>
        </h2>
      </div>

      <!-- Quarter Selector -->
      <div class="quarter-selector">
        <button
          v-for="quarter in 4"
          :key="`q-selector-${quarter}`"
          @click="selectedQuarter = quarter"
          class="quarter-selector-btn"
          :class="{ active: selectedQuarter === quarter }"
        >
          Q{{ quarter }}
        </button>
      </div>

      <!-- Selected Quarter Display -->
      <div class="selected-quarter-display">
        <div class="quarter-info">
          <h3 class="quarter-display-title">Q{{ selectedQuarter }} {{ displayYear }}</h3>
          <p class="quarter-display-period">{{ getQuarterPeriod(selectedQuarter) }}</p>
        </div>

        <!-- Week Grid for Selected Quarter -->
        <div class="quarter-week-grid-wrapper">
          <div class="quarter-week-grid">
            <WeekRect
              v-for="week in getQuarterWeeksForGlance(selectedQuarter)"
              :key="week"
              :week="week"
              :week-data="getWeekData(week)"
              :clickable="isWeekInPast(week)"
              :disabled="!isWeekInPast(week)"
              :year="getYearForWeek(week)"
              show-year-in-tooltip
              @click="navigateToWeek(week)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Quarterly Cards -->
    <div class="quarters-grid">
      <div v-for="quarter in 4" :key="quarter" class="quarter-card">
        <div class="quarter-header">
          <div class="quarter-title-group">
            <h3 class="quarter-title">Q{{ quarter }} {{ displayYear }}</h3>
            <p class="quarter-period">{{ getQuarterPeriod(quarter) }}</p>
          </div>
          <button
            v-if="quarterHasData(quarter)"
            @click="copyQuarterNotes(quarter)"
            class="copy-button"
            :class="{ copied: copiedQuarter === quarter }"
          >
            <Copy class="copy-icon" />
            <span class="copy-tooltip">{{
              copiedQuarter === quarter ? 'Copied!' : 'Copy Notes'
            }}</span>
          </button>
        </div>

        <!-- Sentiment Bar -->
        <SentimentBar
          v-if="quarterHasData(quarter)"
          :distribution="getQuarterSentimentDistribution(quarter)"
          :total-count="getQuarterWeekCount(quarter)"
          :colors="settingsStore.colorSettings.colors"
        />

        <div v-if="quarterHasData(quarter)" class="quarter-content">
          <!-- Accomplishments -->
          <div v-if="getQuarterData(quarter, 'achievements')" class="quarter-section">
            <h4 class="section-subtitle">Accomplishments</h4>
            <div
              class="rich-content"
              v-html="renderMarkdown(getQuarterData(quarter, 'achievements'))"
            ></div>
          </div>

          <!-- Learnings -->
          <div v-if="getQuarterData(quarter, 'learnings')" class="quarter-section">
            <h4 class="section-subtitle">Learnings</h4>
            <div
              class="rich-content"
              v-html="renderMarkdown(getQuarterData(quarter, 'learnings'))"
            ></div>
          </div>

          <!-- Challenges -->
          <div v-if="getQuarterData(quarter, 'challenges')" class="quarter-section">
            <h4 class="section-subtitle">Challenges</h4>
            <div
              class="rich-content"
              v-html="renderMarkdown(getQuarterData(quarter, 'challenges'))"
            ></div>
          </div>
        </div>

        <div v-else class="quarter-placeholder">
          <p class="placeholder-text">No data yet for this quarter</p>
        </div>
      </div>
    </div>

    <!-- Year Controls -->
    <div class="year-controls">
      <button
        @click="copyYearNotes"
        class="year-control-btn copy-year-btn"
        :class="{ copied: copiedYear }"
      >
        <Copy class="control-icon" />
        {{ copiedYear ? 'Copied!' : 'Copy All Notes' }}
      </button>
      <button @click="confirmDeleteYear" class="year-control-btn delete-year-btn">
        <Trash2 class="control-icon" />
        Delete Year Data
      </button>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click="cancelDelete">
      <div class="modal-content" @click.stop>
        <h3 class="modal-title">Delete Year Data</h3>
        <p class="modal-message">
          Are you sure you want to delete all data for {{ displayYear }}? This action cannot be
          undone.
        </p>
        <div class="modal-actions">
          <button @click="cancelDelete" class="modal-btn modal-btn-cancel">Cancel</button>
          <button @click="deleteYearData" class="modal-btn modal-btn-delete">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Copy, Trash2 } from 'lucide-vue-next'
import type { WeeklyData } from '@/utils/db'
import { useSettingsStore } from '@/stores/settings'
import { useWeeklyStore } from '@/stores/weekly'
import {
  getCalendarWeeksForFiscalQuarter,
  getCalendarWeeksForFiscalYear,
  formatFiscalYear,
  getCurrentFiscalYearAndWeek,
} from '@/utils/fiscalYear'
import { EMOJI_SCALE, SENTIMENT_LABELS } from '@/constants/sentiment'
import SentimentBar from '@/components/SentimentBar.vue'
import WeekRect from '@/components/WeekRect.vue'
import { renderMarkdown, markdownToPlainText } from '@/utils/markdown'

const router = useRouter()
const route = useRoute()
const settingsStore = useSettingsStore()
const weeklyStore = useWeeklyStore()

// Track the displayed year (fiscal year if enabled, otherwise calendar year)
const currentYear = ref(new Date().getFullYear())
const copiedQuarter = ref<number | null>(null)
const copiedYear = ref(false)
const showDeleteConfirm = ref(false)

// Selected quarter for at-a-glance view (default to current quarter)
const selectedQuarter = ref(1)

// Get current quarter based on fiscal year settings
const getCurrentQuarter = (): number => {
  const now = new Date()
  const month = now.getMonth() // 0-11

  if (!isFiscalYearMode.value) {
    // Calendar year: simple quarter calculation
    return Math.floor(month / 3) + 1
  }

  // Fiscal year: calculate based on fiscal year start month
  const fiscalMonth = (month - fiscalYearStartMonth.value + 12) % 12
  return Math.floor(fiscalMonth / 3) + 1
}

// Map of week number to WeeklyData
const weeklyDataMap = ref<Map<number, WeeklyData>>(new Map())
// Store all weekly data for the year (for aggregations)
const yearlyData = ref<WeeklyData[]>([])

const emojiScale = EMOJI_SCALE

// Fiscal year computed properties
const fiscalYearStartMonth = computed(() => settingsStore.fiscalYearSettings.startMonth)
const isFiscalYearMode = computed(() => fiscalYearStartMonth.value !== 0)

// Format the displayed year (FY 2025 or 2025)
const displayYear = computed(() => {
  if (isFiscalYearMode.value) {
    return formatFiscalYear(currentYear.value)
  }
  return currentYear.value.toString()
})

// Get week data for a week number
const getWeekData = (week: number): WeeklyData | null => {
  return weeklyDataMap.value.get(week) || null
}

// Get the calendar year for a given week number
const getYearForWeek = (week: number): number => {
  if (!isFiscalYearMode.value) {
    return currentYear.value
  }

  // In fiscal year mode, determine which calendar year this week belongs to
  const calendarYearWeeks = getCalendarWeeksForFiscalYear(
    currentYear.value,
    fiscalYearStartMonth.value,
  )

  for (const [year, weeks] of Object.entries(calendarYearWeeks)) {
    if (weeks.includes(week)) {
      return Number(year)
    }
  }

  return currentYear.value
}

// Get the weeks to display in the "Year at a Glance" grid for a given quarter
const getQuarterWeeksForGlance = (quarter: number): number[] => {
  if (!isFiscalYearMode.value) {
    // Calendar year mode: simple sequential weeks
    const start = (quarter - 1) * 13 + 1
    return Array.from({ length: 13 }, (_, i) => start + i)
  }

  // Fiscal year mode: get calendar weeks for this fiscal quarter
  return getCalendarWeeksForFiscalQuarter(quarter, fiscalYearStartMonth.value)
}

const getQuarterPeriod = (quarter: number): string => {
  if (!isFiscalYearMode.value) {
    const periods = ['January - March', 'April - June', 'July - September', 'October - December']
    return periods[quarter - 1]
  }

  // Get calendar weeks for this fiscal quarter
  const weeks = getCalendarWeeksForFiscalQuarter(quarter, fiscalYearStartMonth.value)
  if (weeks.length === 0) return ''

  // Get start and end months from week numbers (approximate)
  const startWeek = weeks[0]
  const endWeek = weeks[weeks.length - 1]

  const getMonthFromWeek = (week: number): string => {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ]
    // Approximate month from week (week 1-4 = Jan, 5-8 = Feb, etc.)
    const monthIndex = Math.floor((week - 1) / 4.33)
    return monthNames[Math.min(monthIndex, 11)]
  }

  return `${getMonthFromWeek(startWeek)} - ${getMonthFromWeek(endWeek)}`
}

// Get current week number
const getCurrentWeekNumber = (): number => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const diff = now.getTime() - start.getTime()
  const oneWeek = 1000 * 60 * 60 * 24 * 7
  return Math.ceil(diff / oneWeek)
}

// Check if a week is in the past (clickable)
const isWeekInPast = (week: number): boolean => {
  const now = new Date()
  const currentCalendarYear = now.getFullYear()

  // In fiscal year mode, we need to check which calendar year this week belongs to
  if (isFiscalYearMode.value) {
    const calendarYearWeeks = getCalendarWeeksForFiscalYear(
      currentYear.value,
      fiscalYearStartMonth.value,
    )

    // Find which calendar year contains this week
    for (const [year, weeks] of Object.entries(calendarYearWeeks)) {
      if (weeks.includes(week)) {
        const weekCalendarYear = Number(year)

        // If the week's calendar year is in the past, it's clickable
        if (weekCalendarYear < currentCalendarYear) {
          return true
        }

        // If it's the current calendar year, check the week number
        if (weekCalendarYear === currentCalendarYear) {
          return week <= getCurrentWeekNumber()
        }

        // Future year
        return false
      }
    }

    return false
  }

  // Calendar year mode: check if viewing a past year or current year with past weeks
  if (currentYear.value < currentCalendarYear) {
    return true // All weeks in past years are clickable
  }

  if (currentYear.value === currentCalendarYear) {
    return week <= getCurrentWeekNumber() // Only past weeks in current year
  }

  return false // Future year
}

// Navigate to a specific week
const navigateToWeek = (week: number) => {
  // Only allow navigation to past weeks
  if (!isWeekInPast(week)) return

  let calendarYear = currentYear.value

  // In fiscal year mode, we need to determine which calendar year this week belongs to
  if (isFiscalYearMode.value) {
    const calendarYearWeeks = getCalendarWeeksForFiscalYear(
      currentYear.value,
      fiscalYearStartMonth.value,
    )

    // Find which calendar year contains this week
    for (const [year, weeks] of Object.entries(calendarYearWeeks)) {
      if (weeks.includes(week)) {
        calendarYear = Number(year)
        break
      }
    }
  }

  router.push({
    name: 'notes-specific',
    params: {
      year: calendarYear.toString(),
      week: week.toString(),
    },
  })
}

// Load week data for the current year
const loadYearlySentimentData = async () => {
  weeklyDataMap.value.clear()

  if (!isFiscalYearMode.value) {
    // Calendar year mode: load single year
    const yearWeeks = await weeklyStore.loadYearWeeks(currentYear.value)
    yearWeeks.forEach((weekData) => {
      weeklyDataMap.value.set(weekData.week, weekData)
    })
  } else {
    // Fiscal year mode: load from multiple calendar years
    const calendarYearWeeks = getCalendarWeeksForFiscalYear(
      currentYear.value,
      fiscalYearStartMonth.value,
    )

    for (const [calendarYear, weeks] of Object.entries(calendarYearWeeks)) {
      const yearWeeks = await weeklyStore.loadYearWeeks(Number(calendarYear))
      const weekSet = new Set(weeks)

      yearWeeks
        .filter((w) => weekSet.has(w.week))
        .forEach((weekData) => {
          weeklyDataMap.value.set(weekData.week, weekData)
        })
    }
  }
}

// Load all weekly data for the year
const loadYearlyData = async () => {
  if (!isFiscalYearMode.value) {
    // Calendar year mode: load single year
    yearlyData.value = await weeklyStore.loadYearWeeks(currentYear.value)
  } else {
    // Fiscal year mode: load from multiple calendar years
    const calendarYearWeeks = getCalendarWeeksForFiscalYear(
      currentYear.value,
      fiscalYearStartMonth.value,
    )

    const allData: WeeklyData[] = []
    for (const [calendarYear, weeks] of Object.entries(calendarYearWeeks)) {
      const yearData = await weeklyStore.loadYearWeeks(Number(calendarYear))
      // Filter to only include weeks that are part of this fiscal year
      const filteredData = yearData.filter((week) => weeks.includes(week.week))
      allData.push(...filteredData)
    }

    yearlyData.value = allData
  }
}

// Get week range for a quarter (1-4)
const getQuarterWeeks = (quarter: number): { start: number; end: number } => {
  if (!isFiscalYearMode.value) {
    // Calendar year: simple quarters
    const start = (quarter - 1) * 13 + 1
    const end = quarter * 13
    return { start, end }
  }

  // Fiscal year: get calendar weeks for this fiscal quarter
  const weeks = getCalendarWeeksForFiscalQuarter(quarter, fiscalYearStartMonth.value)
  if (weeks.length === 0) {
    return { start: 1, end: 1 }
  }

  return {
    start: Math.min(...weeks),
    end: Math.max(...weeks),
  }
}

// Check if a quarter has any data
const quarterHasData = (quarter: number): boolean => {
  const { start, end } = getQuarterWeeks(quarter)
  return yearlyData.value.some((week) => week.week >= start && week.week <= end)
}

// Get sentiment distribution for a quarter
const getQuarterSentimentDistribution = (quarter: number): { level: number; count: number }[] => {
  const { start, end } = getQuarterWeeks(quarter)
  const distribution = new Map<number, number>()

  for (let week = start; week <= end; week++) {
    const weekData = weeklyDataMap.value.get(week)
    // Only count numeric weekState values (sentiments), not status strings
    if (typeof weekData?.weekState === 'number') {
      distribution.set(weekData.weekState, (distribution.get(weekData.weekState) || 0) + 1)
    }
  }

  // Convert to array and sort by level
  return Array.from(distribution.entries())
    .map(([level, count]) => ({ level, count }))
    .sort((a, b) => a.level - b.level)
}

// Get sentiment label by level
const getSentimentLabel = (level: number): string => {
  return SENTIMENT_LABELS[level - 1] || ''
}

// Get total number of weeks with data in a quarter
const getQuarterWeekCount = (quarter: number): number => {
  const { start, end } = getQuarterWeeks(quarter)
  let count = 0
  for (let week = start; week <= end; week++) {
    const weekData = weeklyDataMap.value.get(week)
    // Only count numeric weekState values (sentiments), not status strings
    if (typeof weekData?.weekState === 'number') {
      count++
    }
  }
  return count
}

// Note: markdownToPlainText is imported from utils/markdown

// Copy quarter notes to clipboard
const copyQuarterNotes = async (quarter: number) => {
  const achievements = getQuarterData(quarter, 'achievements')
  const learnings = getQuarterData(quarter, 'learnings')
  const challenges = getQuarterData(quarter, 'challenges')

  let text = `Q${quarter} ${displayYear.value} - ${getQuarterPeriod(quarter)}\n\n`

  // Add sentiment overview
  const distribution = getQuarterSentimentDistribution(quarter)
  const totalWeeks = getQuarterWeekCount(quarter)
  if (distribution.length > 0) {
    text += `Sentiment Overview (${totalWeeks} weeks):\n`
    distribution.forEach((item) => {
      const percentage = Math.round((item.count / totalWeeks) * 100)
      text += `  ${emojiScale[item.level - 1]} ${getSentimentLabel(item.level)}: ${item.count} week${item.count > 1 ? 's' : ''} (${percentage}%)\n`
    })
    text += '\n'
  }

  if (achievements) {
    text += `Accomplishments:\n${markdownToPlainText(achievements)}\n\n`
  }

  if (learnings) {
    text += `Learnings:\n${markdownToPlainText(learnings)}\n\n`
  }

  if (challenges) {
    text += `Challenges:\n${markdownToPlainText(challenges)}\n`
  }

  try {
    await navigator.clipboard.writeText(text.trim())
    copiedQuarter.value = quarter
    setTimeout(() => {
      copiedQuarter.value = null
    }, 2000)
  } catch (err) {
    console.error('Failed to copy notes:', err)
  }
}

// Copy all year notes to clipboard
const copyYearNotes = async () => {
  let text = `${displayYear.value} Review\n\n`

  for (let quarter = 1; quarter <= 4; quarter++) {
    if (quarterHasData(quarter)) {
      text += `Q${quarter} - ${getQuarterPeriod(quarter)}\n`
      text += '='.repeat(40) + '\n\n'

      // Add sentiment overview
      const distribution = getQuarterSentimentDistribution(quarter)
      const totalWeeks = getQuarterWeekCount(quarter)
      if (distribution.length > 0) {
        text += `Sentiment Overview (${totalWeeks} weeks):\n`
        distribution.forEach((item) => {
          const percentage = Math.round((item.count / totalWeeks) * 100)
          text += `  ${emojiScale[item.level - 1]} ${getSentimentLabel(item.level)}: ${item.count} week${item.count > 1 ? 's' : ''} (${percentage}%)\n`
        })
        text += '\n'
      }

      const achievements = getQuarterData(quarter, 'achievements')
      const learnings = getQuarterData(quarter, 'learnings')
      const challenges = getQuarterData(quarter, 'challenges')

      if (achievements) {
        text += `Accomplishments:\n${markdownToPlainText(achievements)}\n\n`
      }

      if (learnings) {
        text += `Learnings:\n${markdownToPlainText(learnings)}\n\n`
      }

      if (challenges) {
        text += `Challenges:\n${markdownToPlainText(challenges)}\n\n`
      }

      text += '\n'
    }
  }

  try {
    await navigator.clipboard.writeText(text.trim())
    copiedYear.value = true
    setTimeout(() => {
      copiedYear.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy year notes:', err)
  }
}

// Show delete confirmation modal
const confirmDeleteYear = () => {
  showDeleteConfirm.value = true
}

// Cancel delete operation
const cancelDelete = () => {
  showDeleteConfirm.value = false
}

// Delete all data for the current year
const deleteYearData = async () => {
  try {
    if (!isFiscalYearMode.value) {
      // Calendar year mode: delete all weeks for the current calendar year
      for (let week = 1; week <= 52; week++) {
        await weeklyStore.deleteWeek(currentYear.value, week)
      }
    } else {
      // Fiscal year mode: delete weeks across multiple calendar years
      const calendarYearWeeks = getCalendarWeeksForFiscalYear(
        currentYear.value,
        fiscalYearStartMonth.value,
      )

      // Delete all weeks that are part of this fiscal year
      for (const [calendarYear, weeks] of Object.entries(calendarYearWeeks)) {
        for (const week of weeks) {
          await weeklyStore.deleteWeek(Number(calendarYear), week)
        }
      }
    }

    // Close modal
    showDeleteConfirm.value = false

    // Reload data
    await loadYearlySentimentData()
    await loadYearlyData()

    // Navigate to current year review (which will trigger sidebar refresh)
    router.push('/review')
  } catch (err) {
    console.error('Failed to delete year data:', err)
  }
}

// Extract list items from Markdown content
const extractListItems = (markdown: string): string[] => {
  if (!markdown || markdown.trim() === '') {
    return []
  }

  const items: string[] = []
  const lines = markdown.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    // Match unordered list items (-, *, +)
    const unorderedMatch = trimmed.match(/^[-*+]\s+(.+)$/)
    // Match ordered list items (1., 2., etc.)
    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/)

    if (unorderedMatch) {
      items.push(unorderedMatch[1])
    } else if (orderedMatch) {
      items.push(orderedMatch[1])
    } else if (trimmed && !trimmed.startsWith('#')) {
      // Add non-empty lines that aren't headers
      items.push(trimmed)
    }
  }

  return items
}

// Get aggregated data for a quarter by field type
const getQuarterData = (
  quarter: number,
  field: 'achievements' | 'learnings' | 'challenges',
): string => {
  const { start, end } = getQuarterWeeks(quarter)

  // Get all weeks in this quarter
  const quarterWeeks = yearlyData.value.filter((week) => week.week >= start && week.week <= end)

  // Aggregate all list items from all weeks
  const allItems: string[] = []
  quarterWeeks.forEach((week) => {
    const content = week[field]
    if (content && content.trim()) {
      const items = extractListItems(content)
      allItems.push(...items)
    }
  })

  // If we have items, return as markdown list
  if (allItems.length > 0) {
    return allItems.map((item) => `- ${item}`).join('\n')
  }

  return ''
}

// Initialize year from route params or use current year
const initializeYear = () => {
  if (route.params.year) {
    currentYear.value = parseInt(route.params.year as string)
  } else {
    if (isFiscalYearMode.value) {
      // Get current fiscal year
      const { fiscalYear } = getCurrentFiscalYearAndWeek(fiscalYearStartMonth.value)
      currentYear.value = fiscalYear
    } else {
      // Get current calendar year
      currentYear.value = new Date().getFullYear()
    }
  }
}

// Watch for route changes to update year
watch(
  () => route.params.year,
  () => {
    initializeYear()
    loadYearlySentimentData()
    loadYearlyData()
  },
)

onMounted(() => {
  initializeYear()
  loadYearlySentimentData()
  loadYearlyData()

  // Set selected quarter to current quarter if viewing current year
  const now = new Date()
  const currentCalendarYear = now.getFullYear()
  if (currentYear.value === currentCalendarYear) {
    selectedQuarter.value = getCurrentQuarter()
  }
})
</script>

<style scoped>
.review {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  font-size: 1rem;
  color: #6b7280;
  margin: 0;
}

/* Sentiment Overview */
.sentiment-overview {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: visible;
}

.overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.title-full {
  display: inline;
}

.title-short {
  display: none;
}

/* Toggle Switch */
.toggle-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.toggle-checkbox {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: relative;
  width: 2.5rem;
  height: 1.25rem;
  background-color: #d1d5db;
  border-radius: 1.25rem;
  transition: background-color 0.2s;
  margin-right: 0.5rem;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 1rem;
  height: 1rem;
  left: 0.125rem;
  top: 0.125rem;
  background-color: white;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-checkbox:checked + .toggle-slider {
  background-color: var(--color-theme-primary);
}

.toggle-checkbox:checked + .toggle-slider::before {
  transform: translateX(1.25rem);
}

.toggle-text {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

/* Quarter Selector */
.quarter-selector {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.quarter-selector-btn {
  padding: 0.75rem;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
  text-align: center;
}

.quarter-selector-btn:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.quarter-selector-btn.active {
  background: var(--color-theme-primary-lightest);
  border-color: var(--color-theme-primary);
  color: var(--color-theme-primary-darker);
}

/* Selected Quarter Display */
.selected-quarter-display {
  background: #f9fafb;
  border-radius: 0.5rem;
  padding: 1.5rem;
}

.quarter-info {
  margin-bottom: 1.25rem;
  text-align: center;
}

.quarter-display-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.25rem 0;
}

.quarter-display-period {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.quarter-week-grid-wrapper {
  display: flex;
  justify-content: center;
}

.quarter-week-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.375rem;
  max-width: 600px;
  width: 100%;
}

.quarter-week-grid :deep(.week-rect) {
  flex: 0 0 calc((100% - (6 * 0.375rem)) / 7);
  max-width: 4rem;
}

/* Year Controls */
.year-controls {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
}

.year-control-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid;
}

.control-icon {
  width: 1.125rem;
  height: 1.125rem;
}

.copy-year-btn {
  background: white;
  color: var(--color-theme-primary);
  border-color: var(--color-theme-primary);
}

.copy-year-btn:hover {
  background: var(--color-theme-primary);
  color: white;
}

.copy-year-btn.copied {
  background: #dcfce7;
  color: #166534;
  border-color: #86efac;
}

.delete-year-btn {
  background: white;
  color: var(--color-theme-primary);
  border-color: var(--color-theme-primary);
}

.delete-year-btn:hover {
  background: var(--color-theme-primary);
  color: white;
}

/* Modal */
.modal-overlay {
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
}

.modal-content {
  background: white;
  border-radius: 0.75rem;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 1rem 0;
}

.modal-message {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.6;
  margin: 0 0 1.5rem 0;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.modal-btn {
  padding: 0.625rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid;
}

.modal-btn-cancel {
  background: white;
  color: #6b7280;
  border-color: #d1d5db;
}

.modal-btn-cancel:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.modal-btn-delete {
  background: var(--color-theme-primary);
  color: white;
  border-color: var(--color-theme-primary);
}

.modal-btn-delete:hover {
  background: var(--color-theme-primary-dark);
  border-color: var(--color-theme-primary-dark);
}

/* Quarterly Cards */
.quarters-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.quarter-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.quarter-header {
  margin-bottom: 1rem;
  padding-bottom: 0;
  border-bottom: none;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.quarter-title-group {
  flex-shrink: 0;
}

.quarter-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.25rem 0;
}

.quarter-period {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.quarter-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.quarter-section {
  margin: 0;
}

.section-subtitle {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.5rem 0;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.rich-content {
  font-size: 0.875rem;
  line-height: 1.6;
  color: #374151;
}

.rich-content :deep(p) {
  margin: 0 0 0.75rem 0;
  color: #374151;
}

.rich-content :deep(p:last-child) {
  margin-bottom: 0;
}

.rich-content :deep(p:empty) {
  display: none;
}

.rich-content :deep(ul),
.rich-content :deep(ol) {
  margin: 0 0 0.75rem 0;
  padding-left: 1.5rem;
  color: #374151;
}

.rich-content :deep(li) {
  margin-bottom: 0.25rem;
  color: #374151;
}

.rich-content :deep(li p) {
  margin: 0;
  color: #374151;
}

.rich-content :deep(pre) {
  background: #f3f4f6;
  border-radius: 0.375rem;
  padding: 0.75rem;
  overflow-x: auto;
  margin: 0 0 0.75rem 0;
}

.rich-content :deep(code) {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.8125rem;
}

.rich-content :deep(strong) {
  font-weight: 600;
}

.rich-content :deep(em) {
  font-style: italic;
}

.quarter-placeholder {
  padding: 2rem 1rem;
  text-align: center;
}

.placeholder-text {
  font-size: 0.875rem;
  color: #9ca3af;
  font-style: italic;
  margin: 0;
}

.copy-button {
  padding: 0.5rem;
  color: #6b7280;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}

.copy-button:hover {
  background: #f9fafb;
  border-color: #9ca3af;
  color: #374151;
}

.copy-button.copied {
  background: #dcfce7;
  border-color: #86efac;
  color: #166534;
}

.copy-icon {
  width: 1.125rem;
  height: 1.125rem;
}

.copy-tooltip {
  position: absolute;
  bottom: calc(100% + 0.5rem);
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
  transition: opacity 0.2s;
  z-index: 10;
}

.copy-button:hover .copy-tooltip,
.copy-button.copied .copy-tooltip {
  opacity: 1;
}

@media (max-width: 1024px) {
  .quarter-week-grid {
    gap: 0.375rem;
  }
}

@media (max-width: 1000px) {
  .quarters-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .review {
    padding: 0.75rem;
  }

  .sentiment-overview {
    padding: 1rem;
  }

  .section-title {
    font-size: 1.125rem;
  }

  .title-full {
    display: none;
  }

  .title-short {
    display: inline;
  }

  .quarter-selector {
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .quarter-selector-btn {
    padding: 0.625rem;
    font-size: 0.9375rem;
  }

  .selected-quarter-display {
    padding: 1rem;
  }

  .quarter-info {
    margin-bottom: 1rem;
  }

  .quarter-display-title {
    font-size: 1rem;
  }

  .quarter-display-period {
    font-size: 0.8125rem;
  }

  .quarter-week-grid {
    gap: 0.25rem;
    max-width: 90%;
  }

  .quarters-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .quarter-card {
    padding: 1rem;
  }

  .quarter-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .copy-button {
    align-self: flex-start;
  }

  .quarter-title {
    font-size: 1rem;
  }

  .year-controls {
    flex-direction: column;
    gap: 0.75rem;
  }

  .year-control-btn {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .review {
    padding: 0.5rem;
  }

  .sentiment-overview {
    padding: 0.75rem;
  }

  .section-title {
    font-size: 1rem;
  }

  .quarter-selector {
    gap: 0.375rem;
  }

  .quarter-selector-btn {
    padding: 0.5rem;
    font-size: 0.875rem;
  }

  .selected-quarter-display {
    padding: 0.75rem;
  }

  .quarter-info {
    margin-bottom: 0.75rem;
  }

  .quarter-display-title {
    font-size: 0.9375rem;
  }

  .quarter-display-period {
    font-size: 0.75rem;
  }

  .quarter-week-grid {
    gap: 0.1875rem;
    max-width: 100%;
  }

  .quarter-card {
    padding: 0.875rem;
  }
}
</style>
