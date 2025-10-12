<template>
  <div class="settings">
    <!-- Color Customization Section -->
    <div class="settings-section">
      <div class="section-header">
        <h2 class="section-title">Sentiment Colors</h2>
        <p class="section-description">
          Customize the colors representing each sentiment level throughout the app
        </p>
      </div>

      <div class="color-pickers">
        <div class="preset-selector">
          <label class="preset-label">Color Preset</label>
          <div class="preset-buttons">
            <button
              v-for="preset in settingsStore.COLOR_PRESETS"
              :key="preset.id"
              @click="handlePresetSelect(preset.id)"
              :class="[
                'preset-button',
                { active: settingsStore.colorSettings.preset === preset.id },
              ]"
            >
              <span class="preset-name">{{ preset.name }}</span>
              <div class="preset-color-dots">
                <span
                  v-for="(color, index) in getPresetColors(preset)"
                  :key="index"
                  class="color-dot"
                  :style="{ backgroundColor: color }"
                ></span>
              </div>
            </button>
          </div>
        </div>

        <div class="color-preview-row">
          <div
            v-for="(color, index) in settingsStore.colorSettings.colors"
            :key="index"
            class="color-preview-wrapper"
          >
            <div class="color-preview-cell" :style="{ backgroundColor: color }">
              <span class="cell-emoji">{{ emojiScale[index] }}</span>
            </div>
            <span class="emoji-label">{{ colorLabels[index] }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Fiscal Year Settings Section -->
    <div class="settings-section">
      <div class="section-header">
        <h2 class="section-title">Fiscal Year</h2>
        <p class="section-description">
          Configure when your fiscal year begins. Data is stored by calendar year but displayed from
          a fiscal year perspective in the Review section.
        </p>
      </div>

      <div class="fiscal-year-offset">
        <div class="offset-setting">
          <label class="offset-label" for="fiscal-offset">
            Fiscal year start month
            <span class="offset-help">{{ fiscalYearExample }}</span>
          </label>
          <select
            id="fiscal-offset"
            class="offset-select"
            :value="settingsStore.fiscalYearSettings.startMonth"
            @change="handleStartMonthChange"
          >
            <option :value="0">January (Calendar Year)</option>
            <option :value="1">February</option>
            <option :value="2">March</option>
            <option :value="3">April</option>
            <option :value="4">May</option>
            <option :value="5">June</option>
            <option :value="6">July</option>
            <option :value="7">August</option>
            <option :value="8">September</option>
            <option :value="9">October</option>
            <option :value="10">November</option>
            <option :value="11">December</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Local Sync Section (PWA Only) -->
    <div v-if="syncStore.isSyncAvailable" class="settings-section">
      <div class="section-header">
        <h2 class="section-title">Local Sync</h2>
        <p class="section-description">
          Automatically save your data to a local folder on your device for backup and safekeeping.
        </p>
      </div>

      <div class="sync-management">
        <div v-if="!syncStore.isConfigured" class="sync-setup">
          <p class="sync-setup-text">
            Choose a folder where Heartbeat will automatically save your data as you work.
          </p>
          <button @click="handleConnectFolder" class="action-button primary">
            Choose Sync Folder
          </button>
        </div>

        <div v-else class="sync-configured">
          <div class="sync-status-row">
            <div class="sync-status-info">
              <div class="sync-status-badge" :class="syncStatusClass">
                <span class="status-dot"></span>
                {{ syncStatusText }}
              </div>
              <p v-if="syncStore.lastSyncTime" class="last-sync-time">
                Last synced: {{ formatSyncTime(syncStore.lastSyncTime) }}
              </p>
            </div>

            <div class="sync-actions">
              <button
                @click="handleManualSync"
                :disabled="isSyncing"
                class="action-button"
                title="Sync now"
              >
                {{ isSyncing ? 'Syncing...' : 'Sync Now' }}
              </button>
              <button @click="handleDisconnect" class="action-button secondary">Disconnect</button>
            </div>
          </div>

          <div v-if="syncStore.error" class="sync-error">
            {{ syncStore.error }}
          </div>

          <div class="sync-toggle">
            <label class="toggle-label">
              <input
                type="checkbox"
                :checked="syncStore.enabled"
                @change="handleToggleSync"
                class="toggle-checkbox"
              />
              <span class="toggle-slider"></span>
              <span class="toggle-text">Enable automatic sync</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Week Editing Section -->
    <div class="settings-section">
      <div class="section-header">
        <h2 class="section-title">Bulk Editing</h2>
        <p class="section-description">
          Past weeks are locked by default to prevent accidental edits. Unlock all weeks temporarily
          for bulk editing.
        </p>
      </div>

      <div class="data-management">
        <div class="action-item">
          <div class="action-content">
            <h3 class="action-title">Unlock All Weeks</h3>
            <p class="action-description">
              Temporarily unlock all past weeks for editing (60 minutes)
            </p>
            <p v-if="unlockExpiryTime" class="unlock-status">
              All weeks unlocked • {{ formattedUnlockTime }} remaining
            </p>
          </div>
          <button v-if="!unlockExpiryTime" @click="handleUnlockAll" class="action-button primary">
            Unlock All
          </button>
          <button v-else @click="handleLockAll" class="action-button secondary">Lock All</button>
        </div>

        <div v-if="unlockResult" class="import-result" :class="unlockResult.type">
          {{ unlockResult.message }}
        </div>
      </div>
    </div>

    <!-- Data Management Section -->
    <div class="settings-section">
      <div class="section-header">
        <h2 class="section-title">Data Management</h2>
        <p class="section-description">
          Export your data to create a backup or import data from a previous backup. This helps
          protect your data if your browser is wiped or you switch devices.
        </p>
      </div>

      <div class="data-management">
        <div class="action-item">
          <div class="action-content">
            <h3 class="action-title">Export Data</h3>
            <p class="action-description">
              Download all your weekly entries and settings as a JSON file
            </p>
          </div>
          <button @click="handleExport" :disabled="isExporting" class="action-button primary">
            {{ isExporting ? 'Exporting...' : 'Export' }}
          </button>
        </div>

        <div class="action-item">
          <div class="action-content">
            <h3 class="action-title">Import Data</h3>
            <p class="action-description">
              Restore your data from a previously exported backup file
            </p>
          </div>
          <div class="import-actions">
            <input
              type="file"
              ref="fileInput"
              @change="handleFileSelect"
              accept="application/json"
              class="file-input"
            />
            <button @click="triggerFileInput" :disabled="isImporting" class="action-button">
              {{ isImporting ? 'Importing...' : 'Choose File' }}
            </button>
          </div>
        </div>

        <div v-if="importResult" class="import-result" :class="importResult.type">
          {{ importResult.message }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useWeeklyStore } from '@/stores/weekly'
import { useSyncStore } from '@/stores/sync'
import { formatFiscalYear, getCurrentFiscalYearAndWeek } from '@/utils/fiscalYear'
import { EMOJI_SCALE, SENTIMENT_LABELS } from '@/constants/sentiment'
import { performFullSync } from '@/utils/syncManager'

const settingsStore = useSettingsStore()
const weeklyStore = useWeeklyStore()
const syncStore = useSyncStore()

onMounted(() => {
  syncStore.init()
  loadUnlockState()
})

onUnmounted(() => {
  stopUnlockCountdown()
})

const isExporting = ref(false)
const isImporting = ref(false)
const isSyncing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const importResult = ref<{ type: 'success' | 'error'; message: string } | null>(null)

// Unlock all weeks state
const unlockExpiryTime = ref<number | null>(null)
const unlockRemainingTime = ref<number>(0)
const unlockResult = ref<{ type: 'success' | 'error'; message: string } | null>(null)
let unlockCountdownInterval: number | null = null

// Load unlock state from localStorage
const UNLOCK_KEY = 'weekUnlockExpiry'
const loadUnlockState = () => {
  const stored = localStorage.getItem(UNLOCK_KEY)
  if (stored) {
    const expiry = parseInt(stored, 10)
    if (expiry > Date.now()) {
      unlockExpiryTime.value = expiry
      updateUnlockRemainingTime()
      startUnlockCountdown()
    } else {
      localStorage.removeItem(UNLOCK_KEY)
    }
  }
}

// Update remaining unlock time
const updateUnlockRemainingTime = () => {
  if (!unlockExpiryTime.value) {
    unlockRemainingTime.value = 0
    return
  }

  const remaining = unlockExpiryTime.value - Date.now()
  if (remaining <= 0) {
    unlockRemainingTime.value = 0
    unlockExpiryTime.value = null
    localStorage.removeItem(UNLOCK_KEY)
    stopUnlockCountdown()
  } else {
    unlockRemainingTime.value = remaining
  }
}

// Format unlock remaining time as MM:SS
const formattedUnlockTime = computed(() => {
  const totalSeconds = Math.ceil(unlockRemainingTime.value / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

// Start unlock countdown
const startUnlockCountdown = () => {
  if (unlockCountdownInterval !== null) {
    clearInterval(unlockCountdownInterval)
  }

  unlockCountdownInterval = window.setInterval(() => {
    updateUnlockRemainingTime()
  }, 1000)
}

// Stop unlock countdown
const stopUnlockCountdown = () => {
  if (unlockCountdownInterval !== null) {
    clearInterval(unlockCountdownInterval)
    unlockCountdownInterval = null
  }
}

// Unlock all weeks for 60 minutes
const handleUnlockAll = () => {
  const expiry = Date.now() + 60 * 60 * 1000 // 60 minutes
  unlockExpiryTime.value = expiry
  localStorage.setItem(UNLOCK_KEY, expiry.toString())
  updateUnlockRemainingTime()
  startUnlockCountdown()

  unlockResult.value = {
    type: 'success',
    message: 'All weeks unlocked for 60 minutes',
  }
  setTimeout(() => {
    if (unlockResult.value?.message === 'All weeks unlocked for 60 minutes') {
      unlockResult.value = null
    }
  }, 3000)
}

// Lock all weeks
const handleLockAll = () => {
  unlockExpiryTime.value = null
  unlockRemainingTime.value = 0
  localStorage.removeItem(UNLOCK_KEY)
  stopUnlockCountdown()

  unlockResult.value = {
    type: 'success',
    message: 'All weeks locked',
  }
  setTimeout(() => {
    if (unlockResult.value?.message === 'All weeks locked') {
      unlockResult.value = null
    }
  }, 3000)
}

const emojiScale = EMOJI_SCALE
const colorLabels = SENTIMENT_LABELS

// Sync status computed properties
const syncStatusClass = computed(() => {
  switch (syncStore.status) {
    case 'synced':
      return 'status-synced'
    case 'syncing':
      return 'status-syncing'
    case 'error':
      return 'status-error'
    default:
      return 'status-idle'
  }
})

const syncStatusText = computed(() => {
  switch (syncStore.status) {
    case 'synced':
      return 'Synced'
    case 'syncing':
      return 'Syncing...'
    case 'error':
      return 'Error'
    case 'idle':
      return 'Ready'
    default:
      return 'Not configured'
  }
})

// Format sync time
function formatSyncTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
}

// Sync handlers
async function handleConnectFolder() {
  await syncStore.requestDirectory()
}

async function handleToggleSync(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.checked) {
    await syncStore.enableSync()
  } else {
    syncStore.disableSync()
  }
}

async function handleManualSync() {
  isSyncing.value = true
  importResult.value = null

  try {
    const result = await performFullSync()

    if (result.success) {
      importResult.value = {
        type: 'success',
        message: result.conflictResolved
          ? 'Synced successfully! Some conflicts were resolved.'
          : 'Synced successfully!',
      }

      // Reload current week if conflicts were resolved
      if (result.conflictResolved) {
        await weeklyStore.loadCurrentWeek()
        settingsStore.loadSettings()
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        if (importResult.value?.type === 'success') {
          importResult.value = null
        }
      }, 3000)
    } else {
      importResult.value = {
        type: 'error',
        message: result.error || 'Sync failed',
      }
    }
  } catch (e) {
    importResult.value = {
      type: 'error',
      message: e instanceof Error ? e.message : 'Sync failed',
    }
  } finally {
    isSyncing.value = false
  }
}

async function handleDisconnect() {
  if (
    confirm('Are you sure you want to disconnect local sync? Your app data will not be affected.')
  ) {
    await syncStore.disconnect()
    importResult.value = {
      type: 'success',
      message: 'Local sync disconnected',
    }
    setTimeout(() => {
      if (importResult.value?.message === 'Local sync disconnected') {
        importResult.value = null
      }
    }, 3000)
  }
}

const handlePresetSelect = (presetId: string) => {
  settingsStore.setPreset(presetId)
}

const getPresetColors = (preset: (typeof settingsStore.COLOR_PRESETS)[0]): string[] => {
  return preset.colors
}

const handleStartMonthChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  settingsStore.setFiscalYearStartMonth(Number(target.value))
}

// Compute fiscal year example text
const fiscalYearExample = computed(() => {
  const startMonth = settingsStore.fiscalYearSettings.startMonth
  if (startMonth === 0) {
    return 'e.g., 2024 = Jan 2024 - Dec 2024'
  }

  const { fiscalYear } = getCurrentFiscalYearAndWeek(startMonth)
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const startMonthName = monthNames[startMonth]
  const endMonthName = monthNames[startMonth - 1 < 0 ? 11 : startMonth - 1]

  return `e.g., ${formatFiscalYear(fiscalYear)} = ${startMonthName} ${fiscalYear - 1} - ${endMonthName} ${fiscalYear}`
})

// Export data handler
async function handleExport() {
  isExporting.value = true
  importResult.value = null

  try {
    await weeklyStore.exportData()
    importResult.value = {
      type: 'success',
      message: 'Data exported successfully!',
    }
    // Clear success message after 3 seconds
    setTimeout(() => {
      if (importResult.value?.type === 'success') {
        importResult.value = null
      }
    }, 3000)
  } catch (e) {
    importResult.value = {
      type: 'error',
      message: e instanceof Error ? e.message : 'Failed to export data',
    }
  } finally {
    isExporting.value = false
  }
}

// Trigger file input click
function triggerFileInput() {
  fileInput.value?.click()
}

// Handle file selection
async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  isImporting.value = true
  importResult.value = null

  try {
    const result = await weeklyStore.importDataFromFile(file)

    importResult.value = {
      type: 'success',
      message: `Successfully imported ${result.weeksImported} weeks${result.settingsImported ? ' and settings' : ''}!`,
    }

    // Reload settings if they were imported
    if (result.settingsImported) {
      settingsStore.loadSettings()
    }
  } catch (e) {
    importResult.value = {
      type: 'error',
      message: e instanceof Error ? e.message : 'Failed to import data',
    }
  } finally {
    isImporting.value = false
    // Clear the file input
    if (target) {
      target.value = ''
    }
  }
}
</script>

<style scoped>
.settings {
  padding: 2rem;
  max-width: 900px;
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

.settings-section {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}

.section-header {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.5rem 0;
}

.section-description {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.setting-item {
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
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
  width: 3rem;
  height: 1.5rem;
  background-color: #d1d5db;
  border-radius: 1.5rem;
  transition: background-color 0.2s;
  margin-right: 0.75rem;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 1.25rem;
  height: 1.25rem;
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
  transform: translateX(1.5rem);
}

.toggle-text {
  font-size: 0.9375rem;
  color: #374151;
  font-weight: 500;
}

/* Color Pickers */
.color-pickers {
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.preset-selector {
  margin-bottom: 1.5rem;
}

.preset-label {
  display: block;
  font-size: 0.9375rem;
  color: #374151;
  font-weight: 500;
  margin-bottom: 0.75rem;
}

.preset-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.preset-button {
  padding: 0.75rem 1rem;
  border: 2px solid #d1d5db;
  border-radius: 0.5rem;
  background-color: white;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  min-width: 5.5rem;
}

.preset-button:hover {
  border-color: #9ca3af;
  background-color: #f9fafb;
}

.preset-button.active {
  border-color: var(--color-theme-primary);
  background-color: var(--color-theme-primary-lightest);
  color: var(--color-theme-primary-darker);
}

.preset-button:active {
  transform: scale(0.98);
}

.preset-name {
  white-space: nowrap;
}

.preset-color-dots {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}

.color-dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.color-preview-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  justify-content: center;
}

.color-preview-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.color-preview-cell {
  width: 4rem;
  height: 4rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(0, 0, 0, 0.1);
  position: relative;
}

.cell-emoji {
  font-size: 2rem;
}

.emoji-label {
  font-size: 0.75rem;
  color: #6b7280;
  text-align: center;
  margin-top: 0.5rem;
}

/* Fiscal Year Settings */
.fiscal-year-offset {
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.offset-setting {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.offset-label {
  font-size: 0.9375rem;
  color: #374151;
  font-weight: 500;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.offset-help {
  font-size: 0.8125rem;
  color: #6b7280;
  font-weight: 400;
}

.offset-select {
  padding: 0.625rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  color: #374151;
  background-color: white;
  cursor: pointer;
  transition: all 0.2s;
  max-width: 20rem;
}

.offset-select:hover {
  border-color: #9ca3af;
}

.offset-select:focus {
  outline: none;
  border-color: var(--color-theme-primary);
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

/* Sync Management */
.sync-management {
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.sync-setup {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  padding: 1.5rem;
  background-color: #f9fafb;
  border-radius: 0.5rem;
  border: 1px dashed #d1d5db;
}

.sync-setup-text {
  font-size: 0.875rem;
  color: #6b7280;
  text-align: center;
  margin: 0;
  max-width: 500px;
}

.sync-configured {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sync-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.sync-status-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sync-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  width: fit-content;
}

.status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  display: inline-block;
}

.sync-status-badge.status-synced {
  background-color: var(--color-success-bg);
  color: var(--color-success-text);
}

.sync-status-badge.status-synced .status-dot {
  background-color: var(--color-success);
}

.sync-status-badge.status-syncing {
  background-color: var(--color-warning-bg);
  color: var(--color-warning-text);
}

.sync-status-badge.status-syncing .status-dot {
  background-color: var(--color-warning);
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.sync-status-badge.status-error {
  background-color: var(--color-theme-primary-lighter);
  color: var(--color-theme-primary-darker);
}

.sync-status-badge.status-error .status-dot {
  background-color: var(--color-theme-primary);
}

.sync-status-badge.status-idle {
  background-color: #e0e7ff;
  color: #3730a3;
}

.sync-status-badge.status-idle .status-dot {
  background-color: #6366f1;
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

.last-sync-time {
  font-size: 0.8125rem;
  color: #6b7280;
  margin: 0;
}

.sync-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.sync-error {
  padding: 0.75rem 1rem;
  background-color: var(--color-theme-primary-lighter);
  color: var(--color-theme-primary-darker);
  border: 1px solid var(--color-theme-primary-light);
  border-radius: 0.5rem;
  font-size: 0.875rem;
}

.sync-toggle {
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.action-button.secondary {
  background-color: white;
  border-color: #d1d5db;
  color: #6b7280;
}

.action-button.secondary:hover:not(:disabled) {
  background-color: #f9fafb;
  border-color: #9ca3af;
  color: #374151;
}

/* Data Management */
.data-management {
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.action-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0;
  gap: 1rem;
}

.action-item:not(:last-of-type) {
  border-bottom: 1px solid #e5e7eb;
}

.action-content {
  flex: 1;
}

.action-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.25rem 0;
}

.action-description {
  font-size: 0.8125rem;
  color: #6b7280;
  margin: 0;
}

.unlock-status {
  font-size: 0.8125rem;
  color: var(--color-success);
  font-weight: 600;
  margin: 0.5rem 0 0 0;
}

.action-button {
  padding: 0.625rem 1.25rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  background-color: white;
  color: #374151;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.action-button:hover:not(:disabled) {
  border-color: #9ca3af;
  background-color: #f9fafb;
}

.action-button:active:not(:disabled) {
  transform: scale(0.98);
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-button.primary {
  background-color: var(--color-theme-primary);
  border-color: var(--color-theme-primary);
  color: white;
}

.action-button.primary:hover:not(:disabled) {
  background-color: var(--color-theme-primary-dark);
  border-color: var(--color-theme-primary-dark);
}

.import-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.file-input {
  display: none;
}

.import-result {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.import-result.success {
  background-color: var(--color-success-bg);
  color: var(--color-success-text);
  border: 1px solid var(--color-success-border);
}

.import-result.error {
  background-color: var(--color-theme-primary-lighter);
  color: var(--color-theme-primary-darker);
  border: 1px solid var(--color-theme-primary-light);
}

@media (max-width: 768px) {
  .settings {
    padding: 1rem;
  }

  .color-preview-row {
    gap: 0.5rem;
  }

  .color-preview-cell {
    width: 3rem;
    height: 3rem;
  }

  .cell-emoji {
    font-size: 1.5rem;
  }

  .offset-select {
    max-width: 100%;
  }

  .action-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .action-button {
    width: 100%;
  }
}
</style>
