<template>
  <div class="home">
    <!-- Current Week Hero Card -->
    <WeekHeader
      :week-title="currentWeekLabel"
      :week-period="currentWeekPeriod"
      :fiscal-year="currentFiscalYearLabel"
      :week-state="currentWeekData?.weekState ?? null"
      @update:week-state="setWeekState"
      :colors="settingsStore.colorSettings.colors"
      show-navigation
      show-date-picker
      show-week-settings
      :disable-next-navigation="true"
      @navigate-previous="navigateToPreviousWeek"
      @navigate-next="navigateToNextWeek"
      @open-date-picker="isDatePickerOpen = true"
      @open-week-settings="isWeekStatusModalOpen = true"
    >
      <template #action>
        <router-link to="/notes" class="notes-icon-button" title="Enter Notes">
          <NotebookPen class="notes-icon" />
        </router-link>
      </template>

      <template #additional-content>
        <!-- Next Week's Focus Reminder -->
        <div v-if="previousWeekFocus" class="focus-reminder">
          <div class="reminder-header">
            <span class="reminder-icon">🎯</span>
            <span class="reminder-title">Last week you planned to focus on:</span>
          </div>
          <p class="reminder-text">{{ previousWeekFocus }}</p>
        </div>
      </template>
    </WeekHeader>

    <!-- Date Picker Modal -->
    <WeekDatePicker
      :is-open="isDatePickerOpen"
      :current-year="currentWeek.year"
      :current-week="currentWeek.week"
      @close="isDatePickerOpen = false"
      @navigate="handleDatePickerNavigate"
    />

    <!-- Week Status Modal -->
    <WeekStatusModal
      :is-open="isWeekStatusModalOpen"
      :week-status="
        typeof currentWeekData?.weekState === 'string' ? currentWeekData.weekState : null
      "
      :is-editable="true"
      @close="isWeekStatusModalOpen = false"
      @save="handleWeekStatusSave"
    />

    <!-- Stats Row -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value">{{ yearProgress }}</div>
        <div class="stat-label">Year Completed</div>
        <div class="stat-sublabel">{{ currentYearLabel }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ wordsWritten }}</div>
        <div class="stat-label">Notes Taken</div>
        <div class="stat-sublabel">{{ currentYearLabel }} • Words</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ averageSentiment }}</div>
        <div class="stat-label">Quarter Average</div>
        <div class="stat-sublabel">Overall sentiment</div>
      </div>
    </div>

    <!-- Last 8 Weeks Sentiment Chart -->
    <div class="chart-section">
      <h3 class="section-title">Recent Weeks</h3>
      <div class="chart-container">
        <SentimentChart :weekly-data="chartWeeks" :emoji-scale="emojiScale" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NotebookPen } from 'lucide-vue-next'
import type { WeeklyData, WeekStatus } from '@/utils/db'
import { useSettingsStore } from '@/stores/settings'
import { useWeeklyStore } from '@/stores/weekly'
import {
  getCurrentFiscalYearAndWeek,
  getFiscalQuarter,
  formatFiscalYear,
  getCalendarWeeksForFiscalYear,
} from '@/utils/fiscalYear'
import SentimentChart from '@/components/SentimentChart.vue'
import WeekHeader from '@/components/WeekHeader.vue'
import WeekDatePicker from '@/components/WeekDatePicker.vue'
import WeekStatusModal from '@/components/WeekStatusModal.vue'
import { EMOJI_SCALE } from '@/constants/sentiment'

const settingsStore = useSettingsStore()
const weeklyStore = useWeeklyStore()
const router = useRouter()

const emojiScale = EMOJI_SCALE

// Date picker state
const isDatePickerOpen = ref(false)

// Week status modal state
const isWeekStatusModalOpen = ref(false)

const currentWeekData = ref<WeeklyData | null>(null)
const previousWeekData = ref<WeeklyData | null>(null)
const recentWeeks = ref<WeeklyData[]>([])
const monthWeeksLogged = ref(0)
const monthWeeksElapsed = ref(0)
const totalWordsWritten = ref(0)

// Get current week info using ISO 8601 standard
const getCurrentWeek = (): { year: number; week: number } => {
  const now = new Date()
  const target = new Date(now.valueOf())

  // Set to nearest Thursday (current date + 4 - current day of week)
  // Sunday (0) becomes 7 for ISO week calculation
  const dayNr = (now.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)

  // Get first Thursday of the year
  const firstThursday = new Date(target.getFullYear(), 0, 4)
  const firstThursdayDay = (firstThursday.getDay() + 6) % 7
  firstThursday.setDate(firstThursday.getDate() - firstThursdayDay + 3)

  // Calculate week number
  const weekDiff = (target.valueOf() - firstThursday.valueOf()) / (1000 * 60 * 60 * 24 * 7)
  const week = 1 + Math.floor(weekDiff)

  return { year: target.getFullYear(), week }
}

const currentWeek = getCurrentWeek()
const fiscalYearStartMonth = computed(() => settingsStore.fiscalYearSettings.startMonth)
const isFiscalYearMode = computed(() => fiscalYearStartMonth.value !== 0)

// Current week label (just the week number)
const currentWeekLabel = computed(() => {
  return `Week ${currentWeek.week}`
})

// Year label (calendar year, not fiscal)
const currentFiscalYearLabel = computed(() => {
  return currentWeek.year.toString()
})

// Current week period (date range) - ISO week starts on Monday
const currentWeekPeriod = computed(() => {
  const now = new Date()

  // Find Monday of current week (ISO week starts on Monday)
  const dayOfWeek = now.getDay()
  const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek // Adjust for Sunday being 0
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)

  // Sunday is 6 days after Monday
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return `${formatDate(monday)} - ${formatDate(sunday)}`
})

// Previous week's focus
const previousWeekFocus = computed(() => {
  const focus = previousWeekData.value?.nextWeekFocus
  return focus && focus.trim() ? focus.trim() : null
})

// Chart data - reactive to current week changes
const chartWeeks = computed(() => {
  const weeks = [...recentWeeks.value]

  // Update the current week in the list if it exists and has been modified
  if (currentWeekData.value) {
    const currentWeekIndex = weeks.findIndex(
      (w) => w.year === currentWeek.year && w.week === currentWeek.week,
    )
    if (currentWeekIndex !== -1) {
      weeks[currentWeekIndex] = { ...currentWeekData.value }
    }
  }

  return weeks
})

// Month completion (removed from UI but kept for potential future use)
// const monthCompletion = computed(() => {
//   if (monthWeeksElapsed.value === 0) return 'N/A'
//   return `${monthWeeksLogged.value}/${monthWeeksElapsed.value}`
// })

// Year progress
const yearProgress = computed(() => {
  if (!isFiscalYearMode.value) {
    // Calendar year: simple percentage based on current week
    const percentage = Math.round((currentWeek.week / 52) * 100)
    return `${percentage}%`
  }

  // Fiscal year: calculate position within the fiscal year
  const startMonth = fiscalYearStartMonth.value
  const now = new Date()
  const currentMonth = now.getMonth() // 0-11

  // Calculate fiscal year start date
  const fiscalYearStart = new Date(
    currentMonth >= startMonth ? now.getFullYear() : now.getFullYear() - 1,
    startMonth,
    1,
  )

  // Calculate fiscal year end date (one year later, minus one day)
  const fiscalYearEnd = new Date(fiscalYearStart)
  fiscalYearEnd.setFullYear(fiscalYearEnd.getFullYear() + 1)
  fiscalYearEnd.setDate(fiscalYearEnd.getDate() - 1)

  // Calculate days passed and total days
  const daysPassed = Math.floor((now.getTime() - fiscalYearStart.getTime()) / (1000 * 60 * 60 * 24))
  const totalDays = Math.floor(
    (fiscalYearEnd.getTime() - fiscalYearStart.getTime()) / (1000 * 60 * 60 * 24),
  )

  const percentage = Math.round((daysPassed / totalDays) * 100)
  return `${percentage}%`
})

// Current year label
const currentYearLabel = computed(() => {
  if (isFiscalYearMode.value) {
    const { fiscalYear } = getCurrentFiscalYearAndWeek(fiscalYearStartMonth.value)
    return formatFiscalYear(fiscalYear)
  }
  return currentWeek.year.toString()
})

// Calculate quarterly average (computed to be reactive)
const quarterlyAverage = computed(() => {
  const currentQuarter = isFiscalYearMode.value
    ? getFiscalQuarter(currentWeek.week, fiscalYearStartMonth.value)
    : Math.ceil(currentWeek.week / 13)

  // Include current week data if it has a sentiment
  const allWeeks = [...recentWeeks.value]

  // Update the current week in the list if it exists
  if (currentWeekData.value) {
    const currentWeekIndex = allWeeks.findIndex(
      (w) => w.year === currentWeek.year && w.week === currentWeek.week,
    )
    if (currentWeekIndex !== -1) {
      allWeeks[currentWeekIndex] = currentWeekData.value
    }
  }

  const quarterWeeks = allWeeks.filter((w) => {
    const weekQuarter = isFiscalYearMode.value
      ? getFiscalQuarter(w.week, fiscalYearStartMonth.value)
      : Math.ceil(w.week / 13)
    // Only include weeks with numeric sentiment (not status strings)
    return weekQuarter === currentQuarter && typeof w.weekState === 'number'
  })

  if (quarterWeeks.length === 0) return null

  const sum = quarterWeeks.reduce(
    (acc, w) => acc + (typeof w.weekState === 'number' ? w.weekState : 0),
    0,
  )
  return sum / quarterWeeks.length
})

// Average sentiment for current quarter
const averageSentiment = computed(() => {
  if (quarterlyAverage.value === null) return 'N/A'
  const emoji = emojiScale[Math.round(quarterlyAverage.value) - 1]
  return `${emoji} ${quarterlyAverage.value.toFixed(1)}`
})

// Words written (formatted with thousands separator)
const wordsWritten = computed(() => {
  if (totalWordsWritten.value === 0) return '0'
  return totalWordsWritten.value.toLocaleString()
})

// Set week state for current week
const setWeekState = async (state: WeeklyData['weekState']) => {
  // Load current week if not loaded
  if (!currentWeekData.value) {
    await weeklyStore.loadCurrentWeek()
    currentWeekData.value = weeklyStore.currentWeekData
  }

  weeklyStore.updateWeekState(state)
  await weeklyStore.saveCurrentWeek()

  // Refresh local reference
  currentWeekData.value = weeklyStore.currentWeekData
}

// Handle date picker navigation - navigate to Notes view for selected week
const handleDatePickerNavigate = (year: number, week: number) => {
  isDatePickerOpen.value = false
  // Navigate to the notes page for the selected week
  const { year: currentYear, week: currentWeekNum } = currentWeek
  if (year === currentYear && week === currentWeekNum) {
    // Current week - use simple route
    router.push({ name: 'notes' })
  } else {
    // Specific week - use parameterized route
    router.push({
      name: 'notes-specific',
      params: { year: year.toString(), week: week.toString() },
    })
  }
}

// Navigate to previous week
const navigateToPreviousWeek = () => {
  let newWeek = currentWeek.week - 1
  let newYear = currentWeek.year

  if (newWeek < 1) {
    newYear -= 1
    newWeek = 52
  }

  router.push({
    name: 'notes-specific',
    params: { year: newYear.toString(), week: newWeek.toString() },
  })
}

// Navigate to next week (disabled for home page since it's always current week)
const navigateToNextWeek = () => {
  // Not used on home page since we always show current week
}

// Handle week status save from modal
const handleWeekStatusSave = async (status: WeekStatus | null) => {
  weeklyStore.updateWeekState(status)
  await weeklyStore.saveCurrentWeek()
  currentWeekData.value = weeklyStore.currentWeekData
}

// Load all data
const loadData = async () => {
  // Load current week
  await weeklyStore.loadCurrentWeek()
  currentWeekData.value = weeklyStore.currentWeekData

  // Load previous week
  let prevYear = currentWeek.year
  let prevWeek = currentWeek.week - 1
  if (prevWeek < 1) {
    prevWeek = 52
    prevYear = currentWeek.year - 1
  }
  const [previous] = await weeklyStore.loadWeeksBatch([{ year: prevYear, week: prevWeek }])
  previousWeekData.value = previous

  // Load last 8 weeks for chart
  const weeks = await weeklyStore.loadRecentWeeks(8)
  recentWeeks.value = weeks

  // Calculate month completion based on ISO weeks that started in current month
  const now = new Date()
  const currentMonth = now.getMonth() // 0-11
  const currentYear = now.getFullYear()

  // Get Monday of each ISO week and check if it falls in current month
  const getWeekMonday = (year: number, week: number): Date => {
    // Get January 4th (always in week 1)
    const jan4 = new Date(year, 0, 4)
    const jan4Day = (jan4.getDay() + 6) % 7 // Convert to ISO (Mon=0)

    // Get Monday of week 1
    const week1Monday = new Date(jan4)
    week1Monday.setDate(jan4.getDate() - jan4Day)

    // Add weeks
    const targetMonday = new Date(week1Monday)
    targetMonday.setDate(week1Monday.getDate() + (week - 1) * 7)

    return targetMonday
  }

  // Count ISO weeks that started in the current month up to now
  let weeksInMonth = 0
  for (let w = 1; w <= currentWeek.week; w++) {
    const monday = getWeekMonday(currentYear, w)
    if (monday.getMonth() === currentMonth && monday <= now) {
      weeksInMonth++
    }
  }
  monthWeeksElapsed.value = weeksInMonth

  // Count weeks logged in current month
  const yearData = await weeklyStore.loadYearWeeks(currentYear)
  const monthWeeks = yearData.filter((w) => {
    const monday = getWeekMonday(w.year, w.week)
    return monday.getMonth() === currentMonth && w.week <= currentWeek.week
  })
  monthWeeksLogged.value = monthWeeks.length

  // Calculate total words written for the fiscal year
  const countWords = (text: string): number => {
    if (!text || !text.trim()) return 0
    return text.trim().split(/\s+/).length
  }

  // Get all weeks for the current fiscal year
  let fiscalYearWeeks: WeeklyData[]
  if (isFiscalYearMode.value) {
    const { fiscalYear } = getCurrentFiscalYearAndWeek(fiscalYearStartMonth.value)
    const calendarWeekRanges = getCalendarWeeksForFiscalYear(fiscalYear, fiscalYearStartMonth.value)

    // Load all weeks from the calendar years that make up this fiscal year
    const allFiscalWeeks: WeeklyData[] = []
    for (const [year, weeks] of Object.entries(calendarWeekRanges)) {
      const yearWeeks = await weeklyStore.loadYearWeeks(Number(year))
      const filteredWeeks = yearWeeks.filter((w) => weeks.includes(w.week))
      allFiscalWeeks.push(...filteredWeeks)
    }
    fiscalYearWeeks = allFiscalWeeks
  } else {
    // Calendar year mode - just use current year
    fiscalYearWeeks = yearData
  }

  // Count words across all text fields
  totalWordsWritten.value = fiscalYearWeeks.reduce((total, week) => {
    return (
      total +
      countWords(week.achievements) +
      countWords(week.learnings) +
      countWords(week.challenges) +
      countWords(week.nextWeekFocus)
    )
  }, 0)
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.home {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* Notes Icon Button */
.notes-icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.625rem;
  background: var(--gradient-theme-primary);
  color: white;
  text-decoration: none;
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.notes-icon-button:hover {
  background: linear-gradient(90deg, var(--color-theme-primary-darkest) 0%, #6b1818 100%);
}

.notes-icon {
  width: 1.25rem;
  height: 1.25rem;
}

/* Focus Reminder */
.focus-reminder {
  background: var(--color-warning-bg);
  border-left: 4px solid var(--color-warning);
  padding: 1rem 1.25rem;
  border-radius: 0.5rem;
}

.reminder-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.reminder-icon {
  font-size: 1.25rem;
}

.reminder-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #92400e;
}

.reminder-text {
  margin: 0;
  font-size: 0.875rem;
  color: #78350f;
  padding-left: 1.75rem;
}

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.stat-value {
  font-size: 2.25rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #374151;
  font-weight: 600;
}

.stat-sublabel {
  font-size: 0.75rem;
  color: #9ca3af;
  font-weight: 400;
  margin-top: 0.25rem;
}

/* Chart Section */
.chart-section {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 1.5rem 0;
}

.chart-container {
  height: 250px;
  position: relative;
}

/* Responsive */
@media (max-width: 768px) {
  .home {
    padding: 1rem;
  }

  .stats-row {
    grid-template-columns: 1fr;
  }

  .chart-container {
    height: 200px;
  }
}
</style>
