import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import {
  saveToFileSystem,
  loadFromFileSystem,
  resolveConflict,
  performFullSync,
  scheduleSave,
  cancelScheduledSave,
} from '../syncManager'
import { useSyncStore } from '@/stores/sync'
import { db } from '@/utils/db'
import type { ExportData } from '@/utils/exportImport'

describe('syncManager', () => {
  let mockFileHandle: FileSystemFileHandle
  let mockWritable: FileSystemWritableFileStream
  let mockFile: File

  beforeEach(() => {
    setActivePinia(createPinia())

    // Mock matchMedia for PWA detection
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    // Mock showDirectoryPicker
    vi.stubGlobal('showDirectoryPicker', vi.fn())

    // Mock writable stream
    mockWritable = {
      write: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      seek: vi.fn().mockResolvedValue(undefined),
      truncate: vi.fn().mockResolvedValue(undefined),
    } as unknown as FileSystemWritableFileStream

    // Mock file
    mockFile = new File(
      ['{"version":"1.0","exportedAt":"2024-01-01","weeks":[]}'],
      'heartbeat-data.json',
      {
        type: 'application/json',
      },
    )

    // Mock file handle
    mockFileHandle = {
      kind: 'file',
      name: 'heartbeat-data.json',
      getFile: vi.fn().mockResolvedValue(mockFile),
      createWritable: vi.fn().mockResolvedValue(mockWritable),
      isSameEntry: vi.fn(),
      queryPermission: vi.fn().mockResolvedValue('granted'),
      requestPermission: vi.fn().mockResolvedValue('granted'),
    } as unknown as FileSystemFileHandle

    // Clear localStorage
    localStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
    cancelScheduledSave()
  })

  describe('saveToFileSystem', () => {
    it('should save data to file system', async () => {
      const syncStore = useSyncStore()
      await syncStore.init()
      syncStore.enabled = true
      syncStore.directoryHandle = {
        kind: 'directory',
        name: 'test-folder',
      } as FileSystemDirectoryHandle
      syncStore.getFileHandle = vi.fn().mockResolvedValue(mockFileHandle)

      const exportData: ExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        weeks: [],
      }

      const result = await saveToFileSystem(exportData)

      expect(result.success).toBe(true)
      expect(mockFileHandle.createWritable).toHaveBeenCalled()
      expect(mockWritable.write).toHaveBeenCalled()
      expect(mockWritable.close).toHaveBeenCalled()
      expect(syncStore.status).toBe('synced')
    })

    it('should fail if sync is not enabled', async () => {
      const syncStore = useSyncStore()
      syncStore.enabled = false

      const exportData: ExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        weeks: [],
      }

      const result = await saveToFileSystem(exportData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('not enabled')
    })

    it('should handle file handle errors', async () => {
      const syncStore = useSyncStore()
      await syncStore.init()
      syncStore.enabled = true
      syncStore.directoryHandle = {
        kind: 'directory',
        name: 'test-folder',
      } as FileSystemDirectoryHandle
      syncStore.getFileHandle = vi.fn().mockResolvedValue(null)

      const exportData: ExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        weeks: [],
      }

      const result = await saveToFileSystem(exportData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to get file handle')
      expect(syncStore.status).toBe('error')
    })

    it('should handle write errors', async () => {
      const syncStore = useSyncStore()
      await syncStore.init()
      syncStore.enabled = true
      syncStore.directoryHandle = {
        kind: 'directory',
        name: 'test-folder',
      } as FileSystemDirectoryHandle

      const errorWritable = {
        ...mockWritable,
        write: vi.fn().mockRejectedValue(new Error('Write failed')),
      }

      const errorFileHandle = {
        ...mockFileHandle,
        createWritable: vi.fn().mockResolvedValue(errorWritable),
      } as unknown as FileSystemFileHandle

      syncStore.getFileHandle = vi.fn().mockResolvedValue(errorFileHandle)

      const exportData: ExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        weeks: [],
      }

      const result = await saveToFileSystem(exportData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Write failed')
      expect(syncStore.status).toBe('error')
    })
  })

  describe('loadFromFileSystem', () => {
    it('should load data from file system', async () => {
      const syncStore = useSyncStore()
      await syncStore.init()
      syncStore.enabled = true
      syncStore.directoryHandle = {
        kind: 'directory',
        name: 'test-folder',
      } as FileSystemDirectoryHandle
      syncStore.getFileHandle = vi.fn().mockResolvedValue(mockFileHandle)

      const result = await loadFromFileSystem()

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.version).toBe('1.0')
      expect(syncStore.status).toBe('synced')
    })

    it('should handle empty files', async () => {
      const syncStore = useSyncStore()
      await syncStore.init()
      syncStore.enabled = true
      syncStore.directoryHandle = {
        kind: 'directory',
        name: 'test-folder',
      } as FileSystemDirectoryHandle

      const emptyFile = new File([''], 'heartbeat-data.json')
      const emptyFileHandle = {
        ...mockFileHandle,
        getFile: vi.fn().mockResolvedValue(emptyFile),
      } as unknown as FileSystemFileHandle

      syncStore.getFileHandle = vi.fn().mockResolvedValue(emptyFileHandle)

      const result = await loadFromFileSystem()

      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
      expect(syncStore.status).toBe('synced')
    })

    it('should fail if sync is not enabled', async () => {
      const syncStore = useSyncStore()
      syncStore.enabled = false

      const result = await loadFromFileSystem()

      expect(result.success).toBe(false)
      expect(result.error).toContain('not enabled')
    })

    it('should handle read errors', async () => {
      const syncStore = useSyncStore()
      await syncStore.init()
      syncStore.enabled = true
      syncStore.directoryHandle = {
        kind: 'directory',
        name: 'test-folder',
      } as FileSystemDirectoryHandle

      const errorFileHandle = {
        ...mockFileHandle,
        getFile: vi.fn().mockRejectedValue(new Error('Read failed')),
      } as unknown as FileSystemFileHandle

      syncStore.getFileHandle = vi.fn().mockResolvedValue(errorFileHandle)

      const result = await loadFromFileSystem()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Read failed')
      expect(syncStore.status).toBe('error')
    })
  })

  describe('resolveConflict', () => {
    it('should merge weeks by last-write-wins strategy', () => {
      const localData: ExportData = {
        version: '1.0',
        exportedAt: '2024-01-01T12:00:00.000Z',
        weeks: [
          {
            year: 2024,
            week: 1,
            achievements: 'Local achievement',
            challenges: '',
            weekState: null,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01T12:00:00'),
          },
        ],
      }

      const fileData: ExportData = {
        version: '1.0',
        exportedAt: '2024-01-01T10:00:00.000Z',
        weeks: [
          {
            year: 2024,
            week: 1,
            achievements: 'File achievement',
            challenges: '',
            weekState: null,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01T10:00:00'),
          },
        ],
      }

      const { merged, hasConflicts } = resolveConflict(localData, fileData)

      expect(merged.weeks).toHaveLength(1)
      expect(merged.weeks[0].achievements).toBe('Local achievement')
      expect(hasConflicts).toBe(false) // Local is newer, no conflict
    })

    it('should detect conflicts when file is newer', () => {
      const localData: ExportData = {
        version: '1.0',
        exportedAt: '2024-01-01T10:00:00.000Z',
        weeks: [
          {
            year: 2024,
            week: 1,
            achievements: 'Local achievement',
            challenges: '',
            weekState: null,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01T10:00:00'),
          },
        ],
      }

      const fileData: ExportData = {
        version: '1.0',
        exportedAt: '2024-01-01T12:00:00.000Z',
        weeks: [
          {
            year: 2024,
            week: 1,
            achievements: 'File achievement',
            challenges: '',
            weekState: null,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01T12:00:00'),
          },
        ],
      }

      const { merged, hasConflicts } = resolveConflict(localData, fileData)

      expect(merged.weeks).toHaveLength(1)
      expect(merged.weeks[0].achievements).toBe('File achievement')
      expect(hasConflicts).toBe(true) // File is newer, conflict detected
    })

    it('should merge weeks that only exist in one source', () => {
      const localData: ExportData = {
        version: '1.0',
        exportedAt: '2024-01-01T12:00:00.000Z',
        weeks: [
          {
            year: 2024,
            week: 1,
            achievements: 'Local week 1',
            challenges: '',
            weekState: null,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
        ],
      }

      const fileData: ExportData = {
        version: '1.0',
        exportedAt: '2024-01-01T12:00:00.000Z',
        weeks: [
          {
            year: 2024,
            week: 2,
            achievements: 'File week 2',
            challenges: '',
            weekState: null,
            createdAt: new Date('2024-01-02'),
            updatedAt: new Date('2024-01-02'),
          },
        ],
      }

      const { merged, hasConflicts } = resolveConflict(localData, fileData)

      expect(merged.weeks).toHaveLength(2)
      expect(merged.weeks.find((w) => w.week === 1)?.achievements).toBe('Local week 1')
      expect(merged.weeks.find((w) => w.week === 2)?.achievements).toBe('File week 2')
      expect(hasConflicts).toBe(false)
    })

    it('should prefer local settings', () => {
      const localData: ExportData = {
        version: '1.0',
        exportedAt: '2024-01-01T12:00:00.000Z',
        weeks: [],
        settings: {
          colorSettings: { preset: 'ocean' },
        },
      }

      const fileData: ExportData = {
        version: '1.0',
        exportedAt: '2024-01-01T12:00:00.000Z',
        weeks: [],
        settings: {
          colorSettings: { preset: 'sunset' },
        },
      }

      const { merged } = resolveConflict(localData, fileData)

      expect(merged.settings).toEqual({ colorSettings: { preset: 'ocean' } })
    })
  })

  describe('performFullSync', () => {
    it('should perform full sync successfully', async () => {
      const syncStore = useSyncStore()
      await syncStore.init()
      syncStore.enabled = true
      syncStore.directoryHandle = {
        kind: 'directory',
        name: 'test-folder',
      } as FileSystemDirectoryHandle
      syncStore.getFileHandle = vi.fn().mockResolvedValue(mockFileHandle)

      // Mock empty file (first sync)
      const emptyFile = new File([''], 'heartbeat-data.json')
      const emptyFileHandle = {
        ...mockFileHandle,
        getFile: vi.fn().mockResolvedValue(emptyFile),
      } as unknown as FileSystemFileHandle

      syncStore.getFileHandle = vi.fn().mockResolvedValue(emptyFileHandle)

      const result = await performFullSync()

      expect(result.success).toBe(true)
      expect(result.conflictResolved).toBeUndefined()
    })

    it('should detect and resolve conflicts', async () => {
      const syncStore = useSyncStore()
      await syncStore.init()
      syncStore.enabled = true
      syncStore.directoryHandle = {
        kind: 'directory',
        name: 'test-folder',
      } as FileSystemDirectoryHandle

      // Add local data
      await db.saveWeek({
        year: 2024,
        week: 1,
        achievements: 'Local',
        challenges: '',
        weekState: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01T10:00:00'),
      })

      // Mock file with newer data (use far future date to ensure it's newer than current time)
      const futureDate = new Date(Date.now() + 60000) // 1 minute in the future
      const fileContent = JSON.stringify({
        version: '1.0',
        exportedAt: futureDate.toISOString(),
        weeks: [
          {
            year: 2024,
            week: 1,
            achievements: 'File',
            challenges: '',
            weekState: null,
            createdAt: '2024-01-01',
            updatedAt: futureDate.toISOString(),
          },
        ],
      })

      const fileWithData = new File([fileContent], 'heartbeat-data.json')
      const fileHandleWithData = {
        ...mockFileHandle,
        getFile: vi.fn().mockResolvedValue(fileWithData),
      } as unknown as FileSystemFileHandle

      syncStore.getFileHandle = vi.fn().mockResolvedValue(fileHandleWithData)

      const result = await performFullSync()

      expect(result.success).toBe(true)
      expect(result.conflictResolved).toBe(true)

      // Verify file version won (newer)
      const week = await db.getWeek(2024, 1)
      expect(week?.achievements).toBe('File')
    })

    it('should fail if sync is not enabled', async () => {
      const syncStore = useSyncStore()
      syncStore.enabled = false

      const result = await performFullSync()

      expect(result.success).toBe(false)
      expect(result.error).toContain('not enabled')
    })
  })

  describe('scheduleSave', () => {
    it('should debounce saves', async () => {
      const syncStore = useSyncStore()
      await syncStore.init()
      syncStore.enabled = true
      syncStore.directoryHandle = {
        kind: 'directory',
        name: 'test-folder',
      } as FileSystemDirectoryHandle
      syncStore.getFileHandle = vi.fn().mockResolvedValue(mockFileHandle)

      const exportData: ExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        weeks: [],
      }

      // Schedule multiple saves rapidly
      scheduleSave(exportData)
      scheduleSave(exportData)
      scheduleSave(exportData)

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 600))

      // Should only write once
      expect(mockFileHandle.createWritable).toHaveBeenCalledTimes(1)
    })

    it('should cancel pending saves', () => {
      const exportData: ExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        weeks: [],
      }

      scheduleSave(exportData)
      cancelScheduledSave()

      // Wait for what would have been the debounce period
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(mockFileHandle.createWritable).not.toHaveBeenCalled()
          resolve(undefined)
        }, 600)
      })
    })
  })
})
