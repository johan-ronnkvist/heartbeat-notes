import { db, type WeeklyData } from './db'

export interface ExportData {
  version: string
  exportedAt: string
  weeks: WeeklyData[]
  settings?: {
    colorSettings?: unknown
    animationSettings?: unknown
    fiscalYearSettings?: unknown
  }
}

/**
 * Export all data from IndexedDB to a JSON file
 */
export async function exportAllData(): Promise<Blob> {
  const weeks = await db.getAllWeeks()

  // Get settings from localStorage
  const settingsStr = localStorage.getItem('heartbeat-settings')
  let settings = undefined
  if (settingsStr) {
    try {
      settings = JSON.parse(settingsStr)
    } catch (e) {
      console.error('Failed to parse settings for export:', e)
    }
  }

  const exportData: ExportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    weeks,
    settings,
  }

  const json = JSON.stringify(exportData, null, 2)
  return new Blob([json], { type: 'application/json' })
}

/**
 * Download exported data as a file
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Generate a filename for the export
 */
export function generateExportFilename(): string {
  const date = new Date().toISOString().split('T')[0]
  return `heartbeat-backup-${date}.json`
}

/**
 * Validate import data structure
 */
function validateImportData(data: unknown): data is ExportData {
  if (!data || typeof data !== 'object') return false

  const exportData = data as Partial<ExportData>

  if (!exportData.version || !exportData.exportedAt || !Array.isArray(exportData.weeks)) {
    return false
  }

  // Validate each week entry
  return exportData.weeks.every((week) => {
    return (
      typeof week === 'object' &&
      week !== null &&
      'year' in week &&
      'week' in week &&
      'achievements' in week &&
      'challenges' in week
    )
  })
}

/**
 * Import data from a JSON file
 */
export async function importData(file: File): Promise<{
  success: boolean
  weeksImported: number
  settingsImported: boolean
  error?: string
}> {
  try {
    const text = await file.text()
    const data = JSON.parse(text)

    if (!validateImportData(data)) {
      return {
        success: false,
        weeksImported: 0,
        settingsImported: false,
        error: 'Invalid backup file format',
      }
    }

    // Import weeks
    let weeksImported = 0
    for (const week of data.weeks) {
      try {
        // Convert date strings back to Date objects
        const weekData: WeeklyData = {
          ...week,
          createdAt: new Date(week.createdAt),
          updatedAt: new Date(week.updatedAt),
        }
        await db.saveWeek(weekData)
        weeksImported++
      } catch (e) {
        console.error('Failed to import week:', week, e)
      }
    }

    // Import settings if present
    let settingsImported = false
    if (data.settings) {
      try {
        localStorage.setItem('heartbeat-settings', JSON.stringify(data.settings))
        settingsImported = true
      } catch (e) {
        console.error('Failed to import settings:', e)
      }
    }

    return {
      success: true,
      weeksImported,
      settingsImported,
    }
  } catch (e) {
    return {
      success: false,
      weeksImported: 0,
      settingsImported: false,
      error: e instanceof Error ? e.message : 'Unknown error occurred',
    }
  }
}
