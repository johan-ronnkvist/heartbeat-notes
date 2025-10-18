<template>
  <div class="notes">
    <!-- Header Section -->
    <WeekHeader
      :week-title="`Week ${currentWeekNumber}`"
      :week-period="currentWeekRange"
      :fiscal-year="currentFiscalYearLabel"
      :week-state="weekState"
      @update:week-state="setWeekState"
      :colors="settingsStore.colorSettings.colors"
      :sentiment-disabled="!isEditable"
      show-navigation
      show-date-picker
      show-week-settings
      :disable-next-navigation="isCurrentWeek"
      @navigate-previous="navigateToPreviousWeek"
      @navigate-next="navigateToNextWeek"
      @open-date-picker="isDatePickerOpen = true"
      @open-week-settings="isWeekStatusModalOpen = true"
    >
      <template #lock-status>
        <!-- Lock Status Indicator -->
        <div v-if="!isCurrentWeek && !isUnlocked" class="lock-status">
          <Lock class="lock-status-icon" />
          <span class="lock-status-text">This week is locked to prevent accidental edits</span>
          <button class="unlock-button" @click="unlockWeek">
            <LockOpen class="button-icon" />
            Unlock
          </button>
        </div>
        <div v-if="!isCurrentWeek && isUnlocked" class="lock-status">
          <LockOpen class="lock-status-icon" />
          <span class="lock-status-text"
            >Unlocked for editing ({{ formattedRemainingTime }} remaining)</span
          >
          <button class="lock-button" @click="lockWeek">
            <Lock class="button-icon" />
            Lock
          </button>
        </div>
      </template>
    </WeekHeader>

    <!-- Date Picker Modal -->
    <WeekDatePicker
      :is-open="isDatePickerOpen"
      :current-year="viewingYear"
      :current-week="viewingWeek"
      @close="isDatePickerOpen = false"
      @navigate="handleDatePickerNavigate"
    />

    <!-- Week Status Modal -->
    <WeekStatusModal
      :is-open="isWeekStatusModalOpen"
      :week-status="typeof weekState === 'string' ? weekState : null"
      :is-editable="isEditable"
      @close="isWeekStatusModalOpen = false"
      @save="handleWeekStatusSave"
    />

    <!-- Main Content -->
    <div class="content-grid">
      <!-- Accomplishments -->
      <section class="card">
        <div class="card-header">
          <div class="card-title-row">
            <h2 class="card-title">Accomplishments</h2>
            <span
              v-if="weeklyStore.dirtyFields.has('achievements')"
              class="unsaved-indicator"
              title="Unsaved changes"
              >●</span
            >
          </div>
        </div>
        <div class="section-content">
          <RichTextEditor
            v-model="accomplishments"
            placeholder="Add an accomplishment..."
            :disabled="!isEditable"
          />
        </div>
      </section>

      <!-- Challenges -->
      <section class="card">
        <div class="card-header">
          <div class="card-title-row">
            <h2 class="card-title">Challenges</h2>
            <span
              v-if="weeklyStore.dirtyFields.has('challenges')"
              class="unsaved-indicator"
              title="Unsaved changes"
              >●</span
            >
          </div>
        </div>
        <div class="section-content">
          <RichTextEditor
            v-model="challenges"
            placeholder="Describe a challenge or blocker..."
            :disabled="!isEditable"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, onBeforeUnmount, watch } from 'vue'
import { Lock, LockOpen } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import RichTextEditor from '../components/RichTextEditor.vue'
import WeekHeader from '../components/WeekHeader.vue'
import WeekDatePicker from '../components/WeekDatePicker.vue'
import WeekStatusModal from '../components/WeekStatusModal.vue'
import { useWeeklyStore } from '@/stores/weekly'
import { useSettingsStore } from '@/stores/settings'
import type { WeekStatus, WeeklyData } from '@/utils/db'

const weeklyStore = useWeeklyStore()
const settingsStore = useSettingsStore()
const route = useRoute()
const router = useRouter()

// Track current viewing week (separate from the actual current week)
const viewingYear = ref<number>(0)
const viewingWeek = ref<number>(0)

// Date picker state
const isDatePickerOpen = ref(false)

// Week status modal state
const isWeekStatusModalOpen = ref(false)

// Track unlock state per week (key: "year-week", value: expiry timestamp)
const unlockedWeeks = ref<Map<string, number>>(new Map())

// Get the key for the current viewing week
const getWeekKey = (year: number, week: number) => `${year}-${week}`

// Track remaining time for unlocked weeks (in milliseconds)
const remainingTime = ref<number>(0)
let countdownInterval: number | null = null

// Debounced save with 3 second timeout
let saveTimeout: number | null = null

const debouncedSave = () => {
  if (saveTimeout !== null) {
    clearTimeout(saveTimeout)
  }
  saveTimeout = window.setTimeout(async () => {
    await weeklyStore.saveCurrentWeek()
    saveTimeout = null
  }, 3000) // 3 second delay
}

const flushPendingSave = async () => {
  if (saveTimeout !== null) {
    clearTimeout(saveTimeout)
    saveTimeout = null
  }
  if (weeklyStore.dirtyFields.size > 0) {
    await weeklyStore.saveCurrentWeek()
  }
}

// Cleanup on unmount
onUnmounted(() => {
  if (saveTimeout !== null) {
    clearTimeout(saveTimeout)
  }
  stopCountdown()
})

// Warn before unload if save is pending
onBeforeUnmount(async () => {
  await flushPendingSave()
})

// Browser beforeunload event
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (weeklyStore.dirtyFields.size > 0) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

// Get week date range
const getWeekRange = (year: number, week: number) => {
  const firstDayOfYear = new Date(year, 0, 1)
  const daysOffset = (week - 1) * 7
  const monday = new Date(firstDayOfYear)
  monday.setDate(firstDayOfYear.getDate() + daysOffset - firstDayOfYear.getDay() + 1)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return `${formatDate(monday)} - ${formatDate(sunday)}`
}

const currentWeekNumber = computed(() => viewingWeek.value)
const currentWeekRange = computed(() => getWeekRange(viewingYear.value, viewingWeek.value))

// Year label (calendar year, not fiscal)
const currentFiscalYearLabel = computed(() => {
  return viewingYear.value.toString()
})

// Check if we're viewing the current week
const isCurrentWeek = computed(() => {
  const { year, week } = weeklyStore.currentWeek
  return viewingYear.value === year && viewingWeek.value === week
})

// Update remaining time for current viewing week
const updateRemainingTime = () => {
  // Check global unlock first
  const globalUnlockExpiry = localStorage.getItem('weekUnlockExpiry')
  if (globalUnlockExpiry) {
    const expiry = parseInt(globalUnlockExpiry, 10)
    if (expiry > Date.now()) {
      remainingTime.value = expiry - Date.now()
      return
    } else {
      // Global unlock expired, clean it up
      localStorage.removeItem('weekUnlockExpiry')
    }
  }

  // Check individual week unlock
  const weekKey = getWeekKey(viewingYear.value, viewingWeek.value)
  const expiryTime = unlockedWeeks.value.get(weekKey)

  if (!expiryTime) {
    remainingTime.value = 0
    return
  }

  const remaining = expiryTime - Date.now()
  if (remaining <= 0) {
    remainingTime.value = 0
    unlockedWeeks.value.delete(weekKey)
  } else {
    remainingTime.value = remaining
  }
}

// Format remaining time as MM:SS
const formattedRemainingTime = computed(() => {
  const totalSeconds = Math.ceil(remainingTime.value / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

// Check if current viewing week is unlocked
const isUnlocked = computed(() => {
  // Check global unlock first
  const globalUnlockExpiry = localStorage.getItem('weekUnlockExpiry')
  if (globalUnlockExpiry) {
    const expiry = parseInt(globalUnlockExpiry, 10)
    if (expiry > Date.now()) {
      return true
    }
  }

  // Check individual week unlock
  const weekKey = getWeekKey(viewingYear.value, viewingWeek.value)
  const expiryTime = unlockedWeeks.value.get(weekKey)

  if (!expiryTime) return false

  // Check if unlock has expired
  if (Date.now() > expiryTime) {
    unlockedWeeks.value.delete(weekKey)
    return false
  }

  return true
})

// Check if content is editable (current week OR past week that's been unlocked)
const isEditable = computed(() => isCurrentWeek.value || isUnlocked.value)

// Unlock the current viewing week for 60 minutes
const unlockWeek = () => {
  const weekKey = getWeekKey(viewingYear.value, viewingWeek.value)
  const expiryTime = Date.now() + (9 * 60 + 59) * 1000 // 9:59 from now
  unlockedWeeks.value.set(weekKey, expiryTime)
  updateRemainingTime()
  startCountdown()
}

// Manually lock the current viewing week
const lockWeek = () => {
  const weekKey = getWeekKey(viewingYear.value, viewingWeek.value)
  unlockedWeeks.value.delete(weekKey)
  remainingTime.value = 0
  stopCountdown()
}

// Start countdown interval to update remaining time
const startCountdown = () => {
  // Clear existing interval if any
  if (countdownInterval !== null) {
    clearInterval(countdownInterval)
  }

  // Update every second
  countdownInterval = window.setInterval(() => {
    updateRemainingTime()
  }, 1000) // 1 second
}

// Stop countdown interval
const stopCountdown = () => {
  if (countdownInterval !== null) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
}

// Navigate to a specific week and update URL
const navigateToWeek = async (year: number, week: number) => {
  viewingYear.value = year
  viewingWeek.value = week

  // Update countdown for new week
  updateRemainingTime()
  if (isUnlocked.value) {
    startCountdown()
  } else {
    stopCountdown()
  }

  // Update URL
  const { year: currentYear, week: currentWeek } = weeklyStore.currentWeek
  if (year === currentYear && week === currentWeek) {
    // Navigate to current week - use simple route
    router.push({ name: 'notes' })
  } else {
    // Navigate to specific past week - use parameterized route
    router.push({
      name: 'notes-specific',
      params: { year: year.toString(), week: week.toString() },
    })
  }

  await weeklyStore.loadWeek(year, week)
}

// Handle date picker navigation
const handleDatePickerNavigate = async (year: number, week: number) => {
  isDatePickerOpen.value = false
  await flushPendingSave()
  await navigateToWeek(year, week)
}

// Navigation functions - flush pending save before navigating
const navigateToPreviousWeek = async () => {
  await flushPendingSave()

  let newWeek = viewingWeek.value - 1
  let newYear = viewingYear.value

  if (newWeek < 1) {
    newYear -= 1
    newWeek = 52 // Simplified: assume 52 weeks per year
  }

  await navigateToWeek(newYear, newWeek)
}

const navigateToNextWeek = async () => {
  // Don't navigate to future weeks
  if (isCurrentWeek.value) return

  await flushPendingSave()

  let newWeek = viewingWeek.value + 1
  let newYear = viewingYear.value

  if (newWeek > 52) {
    newYear += 1
    newWeek = 1
  }

  await navigateToWeek(newYear, newWeek)
}

// Initialize - load from route params or current week
onMounted(async () => {
  // Check if route has year/week parameters
  const routeYear = route.params.year ? parseInt(route.params.year as string) : null
  const routeWeek = route.params.week ? parseInt(route.params.week as string) : null

  if (routeYear && routeWeek) {
    // Load specific week from route
    viewingYear.value = routeYear
    viewingWeek.value = routeWeek
    await weeklyStore.loadWeek(routeYear, routeWeek)
  } else {
    // Load current week
    await weeklyStore.loadCurrentWeek()
    viewingYear.value = weeklyStore.currentWeek.year
    viewingWeek.value = weeklyStore.currentWeek.week
  }

  // Start countdown if current week is unlocked
  updateRemainingTime()
  if (isUnlocked.value) {
    startCountdown()
  }
})

// Watch for route changes (e.g., browser back/forward)
watch(
  () => route.params,
  async (newParams) => {
    const routeYear = newParams.year ? parseInt(newParams.year as string) : null
    const routeWeek = newParams.week ? parseInt(newParams.week as string) : null

    if (routeYear && routeWeek) {
      // Route has specific year/week - load it if different from current viewing
      if (routeYear !== viewingYear.value || routeWeek !== viewingWeek.value) {
        await flushPendingSave()

        viewingYear.value = routeYear
        viewingWeek.value = routeWeek

        updateRemainingTime()
        if (isUnlocked.value) {
          startCountdown()
        } else {
          stopCountdown()
        }

        await weeklyStore.loadWeek(routeYear, routeWeek)
      }
    } else {
      // Route is /notes (no params) - load current week if not already viewing it
      const { year: currentYear, week: currentWeek } = weeklyStore.currentWeek
      if (viewingYear.value !== currentYear || viewingWeek.value !== currentWeek) {
        await flushPendingSave()

        viewingYear.value = currentYear
        viewingWeek.value = currentWeek

        updateRemainingTime()
        stopCountdown() // Current week doesn't need countdown

        await weeklyStore.loadCurrentWeek()
      }
    }
  },
)

// Week state (sentiment or status)
const weekState = computed(() => weeklyStore.currentWeekData?.weekState ?? null)

function setWeekState(state: WeeklyData['weekState']) {
  weeklyStore.updateWeekState(state)
  weeklyStore.saveCurrentWeek()
}

// Content sections - computed properties with debounced auto-save
const accomplishments = computed({
  get: () => weeklyStore.currentWeekData?.achievements ?? '',
  set: (value: string) => {
    weeklyStore.updateAchievements(value)
    debouncedSave()
  },
})

const challenges = computed({
  get: () => weeklyStore.currentWeekData?.challenges ?? '',
  set: (value: string) => {
    weeklyStore.updateChallenges(value)
    debouncedSave()
  },
})

// Handle week status save from modal
const handleWeekStatusSave = (status: WeekStatus | null) => {
  weeklyStore.updateWeekState(status)
  weeklyStore.saveCurrentWeek()
}
</script>

<style scoped>
.notes {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* Lock Status */
.lock-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin: 1rem auto 0;
  max-width: fit-content;
  padding: 0.5rem 0;
}

.lock-status-icon {
  width: 1.125rem;
  height: 1.125rem;
  color: #6b7280;
  flex-shrink: 0;
}

.lock-status-text {
  color: #6b7280;
  font-size: 0.875rem;
}

.unlock-button,
.lock-button {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.unlock-button {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.unlock-button:hover {
  background: #a7f3d0;
  color: #064e3b;
}

.lock-button {
  background: var(--color-theme-primary-lighter);
  color: var(--color-theme-primary-darker);
  border: 1px solid var(--color-theme-primary-light);
}

.lock-button:hover {
  background: var(--color-theme-primary-light);
  color: var(--color-theme-primary-darkest);
}

.button-icon {
  width: 0.875rem;
  height: 0.875rem;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 1.5rem;
}

.section-content {
  margin-top: 1rem;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.unsaved-indicator {
  color: #f59e0b;
  font-size: 0.75rem;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .notes {
    padding: 0.75rem;
  }

  .content-grid {
    gap: 1rem;
  }

  .lock-status {
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    text-align: center;
  }

  .lock-status-text {
    font-size: 0.8125rem;
  }

  .unlock-button,
  .lock-button {
    width: 100%;
    justify-content: center;
    padding: 0.5rem 1rem;
  }
}

@media (max-width: 480px) {
  .notes {
    padding: 0.5rem;
  }

  .content-grid {
    gap: 0.75rem;
  }

  .lock-status {
    gap: 0.375rem;
    padding: 0.625rem;
  }

  .lock-status-icon {
    width: 1rem;
    height: 1rem;
  }

  .lock-status-text {
    font-size: 0.75rem;
  }

  .unlock-button,
  .lock-button {
    padding: 0.5rem 0.875rem;
    font-size: 0.75rem;
  }

  .button-icon {
    width: 0.75rem;
    height: 0.75rem;
  }
}
</style>
