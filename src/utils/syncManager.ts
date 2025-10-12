import { useSyncStore } from '@/stores/sync'
import type { ExportData } from './exportImport'
import { db } from './db'

export interface SyncResult {
  success: boolean
  error?: string
  conflictResolved?: boolean
}

/**
 * Debounce timer for auto-save
 */
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null
const DEBOUNCE_DELAY = 500 // ms

/**
 * Save data to file system
 */
export async function saveToFileSystem(data: ExportData): Promise<SyncResult> {
  const syncStore = useSyncStore()

  if (!syncStore.canSync) {
    return { success: false, error: 'Sync is not enabled or configured' }
  }

  try {
    syncStore.setStatus('syncing')

    const fileHandle = await syncStore.getFileHandle()
    if (!fileHandle) {
      syncStore.setStatus('error', 'Failed to get file handle')
      return { success: false, error: 'Failed to get file handle' }
    }

    // Create writable stream
    const writable = await fileHandle.createWritable()

    // Write data
    const json = JSON.stringify(data, null, 2)
    await writable.write(json)
    await writable.close()

    syncStore.setStatus('synced')

    return { success: true }
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Failed to save to file system'
    syncStore.setStatus('error', error)
    return { success: false, error }
  }
}

/**
 * Load data from file system
 */
export async function loadFromFileSystem(): Promise<{
  success: boolean
  data?: ExportData
  error?: string
}> {
  const syncStore = useSyncStore()

  if (!syncStore.canSync) {
    return { success: false, error: 'Sync is not enabled or configured' }
  }

  try {
    syncStore.setStatus('syncing')

    const fileHandle = await syncStore.getFileHandle()
    if (!fileHandle) {
      return { success: false, error: 'Failed to get file handle' }
    }

    // Read file
    const file = await fileHandle.getFile()
    const text = await file.text()

    // Parse JSON
    if (!text || text.trim() === '') {
      // File is empty - not an error, just no data yet
      syncStore.setStatus('synced')
      return { success: true }
    }

    const data = JSON.parse(text) as ExportData

    syncStore.setStatus('synced')

    return { success: true, data }
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Failed to load from file system'
    syncStore.setStatus('error', error)
    return { success: false, error }
  }
}

/**
 * Resolve conflicts between local and file data
 * Strategy: Last-write-wins based on updatedAt timestamp
 */
export function resolveConflict(
  localData: ExportData,
  fileData: ExportData,
): { merged: ExportData; hasConflicts: boolean } {
  const merged: ExportData = {
    version: localData.version,
    exportedAt: new Date().toISOString(),
    weeks: [],
    settings: localData.settings,
  }

  // Create maps for easier lookup
  const localWeeksMap = new Map(localData.weeks.map((w) => [`${w.year}-${w.week}`, w]))
  const fileWeeksMap = new Map(fileData.weeks.map((w) => [`${w.year}-${w.week}`, w]))

  let hasConflicts = false

  // Get all unique week keys
  const allKeys = new Set([...localWeeksMap.keys(), ...fileWeeksMap.keys()])

  // Merge each week
  for (const key of allKeys) {
    const localWeek = localWeeksMap.get(key)
    const fileWeek = fileWeeksMap.get(key)

    if (!localWeek && fileWeek) {
      // Only in file - use file version
      merged.weeks.push(fileWeek)
    } else if (localWeek && !fileWeek) {
      // Only local - use local version
      merged.weeks.push(localWeek)
    } else if (localWeek && fileWeek) {
      // In both - compare timestamps
      const localTime = new Date(localWeek.updatedAt).getTime()
      const fileTime = new Date(fileWeek.updatedAt).getTime()

      if (localTime > fileTime) {
        merged.weeks.push(localWeek)
      } else if (fileTime > localTime) {
        merged.weeks.push(fileWeek)
        hasConflicts = true
      } else {
        // Same timestamp - use local
        merged.weeks.push(localWeek)
      }
    }
  }

  // Merge settings - prefer file settings if they're newer
  if (fileData.settings && localData.settings) {
    // For now, just use local settings
    // In future, could compare timestamps if we add them to settings
    merged.settings = localData.settings
  } else if (fileData.settings) {
    merged.settings = fileData.settings
    hasConflicts = true
  }

  return { merged, hasConflicts }
}

/**
 * Perform full sync: load from file, merge with local, save back
 */
export async function performFullSync(): Promise<SyncResult> {
  const syncStore = useSyncStore()

  if (!syncStore.canSync) {
    return { success: false, error: 'Sync is not enabled or configured' }
  }

  try {
    syncStore.setStatus('syncing')

    // Get local data
    const weeks = await db.getAllWeeks()
    const settingsStr = localStorage.getItem('heartbeat-settings')
    let settings = undefined
    if (settingsStr) {
      try {
        settings = JSON.parse(settingsStr)
      } catch (e) {
        console.error('Failed to parse local settings:', e)
      }
    }

    const localData: ExportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      weeks,
      settings,
    }

    // Load from file
    const fileResult = await loadFromFileSystem()

    if (!fileResult.success) {
      // If file doesn't exist or is empty, just save local data
      if (fileResult.error?.includes('empty')) {
        return await saveToFileSystem(localData)
      }
      return { success: false, error: fileResult.error }
    }

    // If no file data, save local data
    if (!fileResult.data) {
      return await saveToFileSystem(localData)
    }

    // Resolve conflicts
    const { merged, hasConflicts } = resolveConflict(localData, fileResult.data)

    // Save merged data back to IndexedDB
    if (hasConflicts) {
      for (const week of merged.weeks) {
        await db.saveWeek(week)
      }

      if (merged.settings) {
        localStorage.setItem('heartbeat-settings', JSON.stringify(merged.settings))
      }
    }

    // Save merged data to file
    const saveResult = await saveToFileSystem(merged)

    return {
      success: saveResult.success,
      error: saveResult.error,
      conflictResolved: hasConflicts,
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Sync failed'
    syncStore.setStatus('error', error)
    return { success: false, error }
  }
}

/**
 * Debounced auto-save to file system
 */
export function scheduleSave(data: ExportData): void {
  // Clear existing timer
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer)
  }

  // Schedule new save
  saveDebounceTimer = setTimeout(async () => {
    await saveToFileSystem(data)
    saveDebounceTimer = null
  }, DEBOUNCE_DELAY)
}

/**
 * Cancel pending save
 */
export function cancelScheduledSave(): void {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer)
    saveDebounceTimer = null
  }
}
