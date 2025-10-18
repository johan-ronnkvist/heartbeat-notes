import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { db, type WeeklyData } from '@/utils/db'
import {
  exportAllData,
  downloadBlob,
  generateExportFilename,
  importData,
  type ExportData,
} from '@/utils/exportImport'
import { createEmptyWeekData } from '@/utils/weekData'
import { useSyncStore } from './sync'
import { scheduleSave } from '@/utils/syncManager'

/**
 * Get current ISO week number and year
 * Uses ISO 8601 week date standard where:
 * - Week 1 is the week containing the first Thursday of the year
 * - Weeks start on Monday
 * - A year can have 52 or 53 weeks
 */
function getCurrentWeek(): { year: number; week: number } {
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

export const useWeeklyStore = defineStore('weekly', () => {
  const currentWeekData = ref<WeeklyData | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Dirty tracking: store loaded state snapshot for comparison
  const loadedWeekDataSnapshot = ref<string | null>(null)
  const dirtyFields = ref<Set<string>>(new Set())

  const currentWeek = computed(() => getCurrentWeek())

  /**
   * Create snapshot of current week data for dirty tracking
   */
  function createSnapshot(data: WeeklyData): string {
    return JSON.stringify({
      achievements: data.achievements,
      challenges: data.challenges,
      weekState: data.weekState,
    })
  }

  /**
   * Load weekly data for current week
   */
  async function loadCurrentWeek() {
    isLoading.value = true
    error.value = null

    try {
      const { year, week } = getCurrentWeek()
      const data = await db.getWeek(year, week)

      currentWeekData.value = data || createEmptyWeekData(year, week)
      loadedWeekDataSnapshot.value = createSnapshot(currentWeekData.value)
      dirtyFields.value.clear()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load week data'
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Load specific week data
   */
  async function loadWeek(year: number, week: number) {
    isLoading.value = true
    error.value = null

    try {
      const data = await db.getWeek(year, week)

      currentWeekData.value = data || createEmptyWeekData(year, week)
      loadedWeekDataSnapshot.value = createSnapshot(currentWeekData.value)
      dirtyFields.value.clear()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load week data'
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Save current week data
   */
  async function saveCurrentWeek() {
    if (!currentWeekData.value) return

    isLoading.value = true
    error.value = null

    try {
      // Spread operator creates a plain copy, avoiding reactivity issues with IndexedDB
      await db.saveWeek({ ...currentWeekData.value })
      // Update snapshot and clear dirty fields after successful save
      loadedWeekDataSnapshot.value = createSnapshot(currentWeekData.value)
      dirtyFields.value.clear()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to save week data'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Check if a field has unsaved changes
   */
  function checkFieldDirty(fieldName: string) {
    if (!currentWeekData.value || !loadedWeekDataSnapshot.value) return

    const currentSnapshot = createSnapshot(currentWeekData.value)
    const currentData = JSON.parse(currentSnapshot)
    const loadedData = JSON.parse(loadedWeekDataSnapshot.value)

    if (currentData[fieldName] !== loadedData[fieldName]) {
      dirtyFields.value.add(fieldName)
    } else {
      dirtyFields.value.delete(fieldName)
    }
  }

  /**
   * Generic field update method
   * Updates a specific field in the current week data and marks it as dirty if changed
   */
  function updateField<K extends keyof WeeklyData>(field: K, value: WeeklyData[K]) {
    if (!currentWeekData.value) return
    currentWeekData.value[field] = value
    checkFieldDirty(field as string)
  }

  /**
   * Update achievements for current week
   */
  function updateAchievements(content: string) {
    updateField('achievements', content)
  }

  /**
   * Update challenges for current week
   */
  function updateChallenges(content: string) {
    updateField('challenges', content)
  }

  /**
   * Update week state for current week
   * Can be a sentiment level (1-5), a status ('vacation' | 'sick'), or null
   */
  function updateWeekState(state: WeeklyData['weekState']) {
    updateField('weekState', state)
  }

  /**
   * @deprecated Use updateWeekState instead
   */
  function updateSentiment(level: number | null) {
    updateWeekState(level)
  }

  /**
   * @deprecated Use updateWeekState instead
   */
  function updateWeekStatus(status: WeeklyData['weekState']) {
    updateWeekState(status)
  }

  /**
   * Load multiple weeks in a batch
   */
  async function loadWeeksBatch(
    weeks: Array<{ year: number; week: number }>,
  ): Promise<(WeeklyData | null)[]> {
    try {
      return await Promise.all(weeks.map(({ year, week }) => db.getWeek(year, week)))
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load weeks batch'
      throw e
    }
  }

  /**
   * Load all weeks for a specific year
   */
  async function loadYearWeeks(year: number): Promise<WeeklyData[]> {
    try {
      return await db.getWeeksByYear(year)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load year weeks'
      throw e
    }
  }

  /**
   * Load recent weeks (from current week backwards)
   */
  async function loadRecentWeeks(count: number): Promise<WeeklyData[]> {
    try {
      const { year, week } = getCurrentWeek()
      const weeks: WeeklyData[] = []

      for (let i = 0; i < count; i++) {
        let targetYear = year
        let targetWeek = week - i

        if (targetWeek < 1) {
          targetWeek = 52 + targetWeek
          targetYear = year - 1
        }

        const weekData = await db.getWeek(targetYear, targetWeek)
        if (weekData) {
          weeks.push(weekData)
        } else {
          // Add placeholder for weeks without data
          weeks.push(createEmptyWeekData(targetYear, targetWeek))
        }
      }

      return weeks.reverse()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load recent weeks'
      throw e
    }
  }

  /**
   * Get sentiment data for a year (weeks with sentiment values)
   */
  async function getYearSentimentData(
    year: number,
  ): Promise<Array<{ week: number; sentiment: number }>> {
    try {
      const weeks = await db.getWeeksByYear(year)
      return weeks
        .filter((w) => typeof w.weekState === 'number')
        .map((w) => ({ week: w.week, sentiment: w.weekState as number }))
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load year sentiment data'
      throw e
    }
  }

  /**
   * Delete a specific week
   */
  async function deleteWeek(year: number, week: number): Promise<void> {
    try {
      await db.deleteWeek(year, week)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete week'
      throw e
    }
  }

  /**
   * Export all weekly data to a JSON file
   */
  async function exportData() {
    try {
      const blob = await exportAllData()
      const filename = generateExportFilename()
      downloadBlob(blob, filename)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to export data'
      throw e
    }
  }

  /**
   * Import weekly data from a JSON file
   */
  async function importDataFromFile(file: File) {
    isLoading.value = true
    error.value = null

    try {
      const result = await importData(file)

      if (!result.success) {
        error.value = result.error || 'Failed to import data'
        throw new Error(error.value)
      }

      // Reload current week after import
      await loadCurrentWeek()

      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to import data'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Trigger auto-sync when data changes
   */
  async function triggerAutoSync() {
    const syncStore = useSyncStore()

    if (!syncStore.canSync) {
      return
    }

    try {
      // Export current data
      const weeks = await db.getAllWeeks()
      const settingsStr = localStorage.getItem('heartbeat-settings')
      let settings = undefined
      if (settingsStr) {
        try {
          settings = JSON.parse(settingsStr)
        } catch (e) {
          console.error('Failed to parse settings for sync:', e)
        }
      }

      const exportData: ExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        weeks,
        settings,
      }

      // Schedule debounced save
      scheduleSave(exportData)
    } catch (e) {
      console.error('Auto-sync failed:', e)
    }
  }

  /**
   * Watch for data changes and trigger sync
   */
  watch(
    () => currentWeekData.value,
    () => {
      triggerAutoSync()
    },
    { deep: true },
  )

  return {
    currentWeekData,
    currentWeek,
    isLoading,
    error,
    dirtyFields,
    loadCurrentWeek,
    loadWeek,
    saveCurrentWeek,
    updateField,
    updateAchievements,
    updateChallenges,
    updateWeekState,
    updateSentiment, // deprecated
    updateWeekStatus, // deprecated
    loadWeeksBatch,
    loadYearWeeks,
    loadRecentWeeks,
    getYearSentimentData,
    deleteWeek,
    exportData,
    importDataFromFile,
    triggerAutoSync,
  }
})
