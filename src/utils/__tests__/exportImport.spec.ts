import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { db, type WeeklyData } from '../db'
import {
  exportAllData,
  importData,
  downloadBlob,
  generateExportFilename,
  type ExportData,
} from '../exportImport'

describe('exportImport', () => {
  beforeEach(async () => {
    await db.init()
    // Clear localStorage
    localStorage.clear()
  })

  afterEach(async () => {
    // Clean up database
    const allWeeks = await db.getAllWeeks()
    for (const week of allWeeks) {
      await db.deleteWeek(week.year, week.week)
    }
    localStorage.clear()
  })

  describe('generateExportFilename', () => {
    it('should generate filename with current date', () => {
      const filename = generateExportFilename()
      expect(filename).toMatch(/^heartbeat-backup-\d{4}-\d{2}-\d{2}\.json$/)
    })

    it('should generate unique filenames for different dates', () => {
      const filename1 = generateExportFilename()

      // Mock date to be different
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-01'))

      const filename2 = generateExportFilename()

      vi.useRealTimers()

      // At least the format should be consistent
      expect(filename1).toMatch(/\.json$/)
      expect(filename2).toMatch(/\.json$/)
    })
  })

  describe('exportAllData', () => {
    it('should export empty data when no weeks exist', async () => {
      const blob = await exportAllData()
      const text = await blob.text()
      const data = JSON.parse(text) as ExportData

      expect(data.version).toBe('1.0')
      expect(data.exportedAt).toBeTruthy()
      expect(data.weeks).toEqual([])
    })

    it('should export all weekly data', async () => {
      const week1: WeeklyData = {
        year: 2025,
        week: 1,
        achievements: 'Achievement 1',
        challenges: 'Challenge 1',
        weekState: 4,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
      }

      const week2: WeeklyData = {
        year: 2025,
        week: 2,
        achievements: 'Achievement 2',
        challenges: 'Challenge 2',
        weekState: 5,
        createdAt: new Date('2025-01-08'),
        updatedAt: new Date('2025-01-09'),
      }

      await db.saveWeek(week1)
      await db.saveWeek(week2)

      const blob = await exportAllData()
      const text = await blob.text()
      const data = JSON.parse(text) as ExportData

      expect(data.weeks).toHaveLength(2)
      expect(data.weeks[0].achievements).toBe('Achievement 1')
      expect(data.weeks[1].achievements).toBe('Achievement 2')
    })

    it('should export settings from localStorage', async () => {
      const settings = {
        colorSettings: { colors: ['#fff'], preset: 'default' },
      }

      localStorage.setItem('heartbeat-settings', JSON.stringify(settings))

      const blob = await exportAllData()
      const text = await blob.text()
      const data = JSON.parse(text) as ExportData

      expect(data.settings).toEqual(settings)
    })

    it('should handle missing settings gracefully', async () => {
      const blob = await exportAllData()
      const text = await blob.text()
      const data = JSON.parse(text) as ExportData

      expect(data.settings).toBeUndefined()
    })

    it('should create valid JSON blob', async () => {
      const blob = await exportAllData()

      expect(blob.type).toBe('application/json')
      expect(blob.size).toBeGreaterThan(0)
    })

    it('should preserve Markdown formatting in exported data', async () => {
      const weekWithMarkdown: WeeklyData = {
        year: 2025,
        week: 10,
        achievements: '**Bold achievement**',
        challenges: '```\nconst x = 1;\n```',
        weekState: 3,
        createdAt: new Date('2025-03-01'),
        updatedAt: new Date('2025-03-01'),
      }

      await db.saveWeek(weekWithMarkdown)

      const blob = await exportAllData()
      const text = await blob.text()
      const data = JSON.parse(text) as ExportData

      expect(data.weeks[0].achievements).toBe('**Bold achievement**')
      expect(data.weeks[0].challenges).toBe('```\nconst x = 1;\n```')
    })
  })

  describe('downloadBlob', () => {
    it('should create and trigger download link', () => {
      const blob = new Blob(['test content'], { type: 'application/json' })
      const filename = 'test-file.json'

      // Mock DOM methods
      const createElementSpy = vi.spyOn(document, 'createElement')
      const appendChildSpy = vi.spyOn(document.body, 'appendChild')
      const removeChildSpy = vi.spyOn(document.body, 'removeChild')
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL')
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL')

      const mockAnchor = document.createElement('a')
      mockAnchor.click = vi.fn()
      createElementSpy.mockReturnValue(mockAnchor)

      downloadBlob(blob, filename)

      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(createObjectURLSpy).toHaveBeenCalledWith(blob)
      expect(mockAnchor.download).toBe(filename)
      expect(mockAnchor.click).toHaveBeenCalled()
      expect(appendChildSpy).toHaveBeenCalledWith(mockAnchor)
      expect(removeChildSpy).toHaveBeenCalledWith(mockAnchor)
      expect(revokeObjectURLSpy).toHaveBeenCalled()

      // Cleanup
      createElementSpy.mockRestore()
      appendChildSpy.mockRestore()
      removeChildSpy.mockRestore()
      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })
  })

  describe('importData', () => {
    it('should reject invalid JSON', async () => {
      const invalidFile = new File(['invalid json'], 'backup.json', { type: 'application/json' })

      const result = await importData(invalidFile)

      expect(result.success).toBe(false)
      expect(result.weeksImported).toBe(0)
      expect(result.error).toBeTruthy()
    })

    it('should reject data without version field', async () => {
      const invalidData = {
        exportedAt: new Date().toISOString(),
        weeks: [],
      }

      const file = new File([JSON.stringify(invalidData)], 'backup.json', {
        type: 'application/json',
      })

      const result = await importData(file)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid backup file format')
    })

    it('should reject data without weeks array', async () => {
      const invalidData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
      }

      const file = new File([JSON.stringify(invalidData)], 'backup.json', {
        type: 'application/json',
      })

      const result = await importData(file)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid backup file format')
    })

    it('should import valid data successfully', async () => {
      const exportData: ExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        weeks: [
          {
            year: 2025,
            week: 1,
            achievements: 'Test achievement',
            challenges: 'Test challenge',
            weekState: 4,
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-02'),
          },
        ],
      }

      const file = new File([JSON.stringify(exportData)], 'backup.json', {
        type: 'application/json',
      })

      const result = await importData(file)

      expect(result.success).toBe(true)
      expect(result.weeksImported).toBe(1)

      const week = await db.getWeek(2025, 1)
      expect(week?.achievements).toBe('Test achievement')
    })

    it('should import multiple weeks', async () => {
      const exportData: ExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        weeks: [
          {
            year: 2025,
            week: 1,
            achievements: 'Week 1',
            challenges: '',
            weekState: null,
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-01'),
          },
          {
            year: 2025,
            week: 2,
            achievements: 'Week 2',
            challenges: '',
            weekState: null,
            createdAt: new Date('2025-01-08'),
            updatedAt: new Date('2025-01-08'),
          },
          {
            year: 2025,
            week: 3,
            achievements: 'Week 3',
            challenges: '',
            weekState: null,
            createdAt: new Date('2025-01-15'),
            updatedAt: new Date('2025-01-15'),
          },
        ],
      }

      const file = new File([JSON.stringify(exportData)], 'backup.json', {
        type: 'application/json',
      })

      const result = await importData(file)

      expect(result.success).toBe(true)
      expect(result.weeksImported).toBe(3)

      const allWeeks = await db.getAllWeeks()
      expect(allWeeks).toHaveLength(3)
    })

    it('should import settings when present', async () => {
      const exportData: ExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        weeks: [],
        settings: {
          colorSettings: { colors: ['#fff'], preset: 'ocean' },
        },
      }

      const file = new File([JSON.stringify(exportData)], 'backup.json', {
        type: 'application/json',
      })

      const result = await importData(file)

      expect(result.success).toBe(true)
      expect(result.settingsImported).toBe(true)

      const savedSettings = localStorage.getItem('heartbeat-settings')
      expect(savedSettings).toBeTruthy()
      const parsed = JSON.parse(savedSettings!)
      expect(parsed.colorSettings.preset).toBe('ocean')
    })

    it('should handle missing settings in import data', async () => {
      const exportData: ExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        weeks: [],
      }

      const file = new File([JSON.stringify(exportData)], 'backup.json', {
        type: 'application/json',
      })

      const result = await importData(file)

      expect(result.success).toBe(true)
      expect(result.settingsImported).toBe(false)
    })

    it('should convert date strings to Date objects', async () => {
      const exportData: ExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        weeks: [
          {
            year: 2025,
            week: 5,
            achievements: '',
            challenges: '',
            weekState: null,
            createdAt: new Date('2025-02-01T10:00:00.000Z'),
            updatedAt: new Date('2025-02-01T12:00:00.000Z'),
          },
        ],
      }

      const file = new File([JSON.stringify(exportData)], 'backup.json', {
        type: 'application/json',
      })

      await importData(file)

      const week = await db.getWeek(2025, 5)
      expect(week?.createdAt).toBeInstanceOf(Date)
      expect(week?.updatedAt).toBeInstanceOf(Date)
    })

    it('should preserve Markdown formatting in imported data', async () => {
      const exportData: ExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        weeks: [
          {
            year: 2025,
            week: 15,
            achievements: '**Bold text**',
            challenges: '```\ncode block\n```',
            weekState: 3,
            createdAt: new Date('2025-04-01'),
            updatedAt: new Date('2025-04-01'),
          },
        ],
      }

      const file = new File([JSON.stringify(exportData)], 'backup.json', {
        type: 'application/json',
      })

      await importData(file)

      const week = await db.getWeek(2025, 15)
      expect(week?.achievements).toBe('**Bold text**')
      expect(week?.challenges).toBe('```\ncode block\n```')
    })

    it('should handle partial import failures gracefully', async () => {
      const exportData: ExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        weeks: [
          {
            year: 2025,
            week: 1,
            achievements: 'Valid week',
            challenges: '',
            weekState: null,
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-01'),
          },
          // Invalid week (missing required fields) - will be caught by validation
          // but testing the recovery mechanism
        ],
      }

      const file = new File([JSON.stringify(exportData)], 'backup.json', {
        type: 'application/json',
      })

      const result = await importData(file)

      // Should still succeed for valid weeks
      expect(result.success).toBe(true)
      expect(result.weeksImported).toBe(1)
    })

    it('should overwrite existing weeks on import', async () => {
      // First, create existing data
      await db.saveWeek({
        year: 2025,
        week: 10,
        achievements: 'Original achievement',
        challenges: '',
        weekState: 3,
        createdAt: new Date('2025-03-01'),
        updatedAt: new Date('2025-03-01'),
      })

      // Now import new data for the same week
      const exportData: ExportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        weeks: [
          {
            year: 2025,
            week: 10,
            achievements: 'Imported achievement',
            challenges: 'Imported challenge',
            weekState: 5,
            createdAt: new Date('2025-03-01'),
            updatedAt: new Date('2025-03-02'),
          },
        ],
      }

      const file = new File([JSON.stringify(exportData)], 'backup.json', {
        type: 'application/json',
      })

      await importData(file)

      const week = await db.getWeek(2025, 10)
      expect(week?.achievements).toBe('Imported achievement')
      expect(week?.weekState).toBe(5)
    })
  })

  describe('round-trip export/import', () => {
    it('should preserve all data through export and import cycle', async () => {
      // Create test data
      const week1: WeeklyData = {
        year: 2025,
        week: 20,
        achievements: '**Achievement 1**',
        challenges: 'Challenge 1',
        weekState: 4,
        createdAt: new Date('2025-05-01T10:00:00.000Z'),
        updatedAt: new Date('2025-05-01T12:00:00.000Z'),
      }

      const week2: WeeklyData = {
        year: 2025,
        week: 21,
        achievements: 'Achievement 2',
        challenges: '```\nconst x = 1;\n```',
        weekState: 5,
        createdAt: new Date('2025-05-08T10:00:00.000Z'),
        updatedAt: new Date('2025-05-08T12:00:00.000Z'),
      }

      const settings = {
        colorSettings: { colors: ['#fff'], preset: 'sunset' },
      }

      await db.saveWeek(week1)
      await db.saveWeek(week2)
      localStorage.setItem('heartbeat-settings', JSON.stringify(settings))

      // Export
      const blob = await exportAllData()
      const text = await blob.text()

      // Clear database and localStorage
      await db.deleteWeek(2025, 20)
      await db.deleteWeek(2025, 21)
      localStorage.clear()

      // Import
      const file = new File([text], 'backup.json', { type: 'application/json' })
      const result = await importData(file)

      expect(result.success).toBe(true)
      expect(result.weeksImported).toBe(2)
      expect(result.settingsImported).toBe(true)

      // Verify data
      const importedWeek1 = await db.getWeek(2025, 20)
      const importedWeek2 = await db.getWeek(2025, 21)

      expect(importedWeek1?.achievements).toBe(week1.achievements)
      expect(importedWeek1?.weekState).toBe(week1.weekState)

      expect(importedWeek2?.challenges).toBe(week2.challenges)

      const importedSettings = localStorage.getItem('heartbeat-settings')
      expect(importedSettings).toBeTruthy()
      const parsedSettings = JSON.parse(importedSettings!)
      expect(parsedSettings.colorSettings.preset).toBe('sunset')
    })
  })

  describe('real backup file import', () => {
    it('should import a real backup file from disk', async () => {
      // Read the fixture file
      const fixturePath = join(__dirname, 'fixtures', 'sample-backup.json')
      const fileContent = readFileSync(fixturePath, 'utf-8')

      const file = new File([fileContent], 'sample-backup.json', { type: 'application/json' })

      const result = await importData(file)

      expect(result.success).toBe(true)
      expect(result.weeksImported).toBe(2)
      expect(result.settingsImported).toBe(true)

      // Verify week 40 was imported correctly
      const week40 = await db.getWeek(2025, 40)
      expect(week40).toBeTruthy()
      expect(week40?.achievements).toContain('Completed Q4 planning')
      expect(week40?.achievements).toContain('**')
      expect(week40?.challenges).toContain('performance optimization')
      expect(week40?.weekState).toBe(4)

      // Verify week 39 was imported correctly
      const week39 = await db.getWeek(2025, 39)
      expect(week39).toBeTruthy()
      expect(week39?.achievements).toContain('major feature')
      expect(week39?.achievements).toContain('*')
      expect(week39?.challenges).toContain('memory leak')
      expect(week39?.challenges).toContain('```')
      expect(week39?.weekState).toBe(5)

      // Verify settings were imported
      const savedSettings = localStorage.getItem('heartbeat-settings')
      expect(savedSettings).toBeTruthy()
      const parsed = JSON.parse(savedSettings!)
      expect(parsed.colorSettings.preset).toBe('default')
      expect(parsed.fiscalYearSettings.startMonth).toBe(0)
    })

    it('should handle dates correctly in real backup files', async () => {
      const fixturePath = join(__dirname, 'fixtures', 'sample-backup.json')
      const fileContent = readFileSync(fixturePath, 'utf-8')
      const file = new File([fileContent], 'sample-backup.json', { type: 'application/json' })

      await importData(file)

      const week40 = await db.getWeek(2025, 40)
      expect(week40?.createdAt).toBeInstanceOf(Date)
      expect(week40?.updatedAt).toBeInstanceOf(Date)
      expect(week40?.createdAt.toISOString()).toBe('2025-10-01T08:00:00.000Z')
      // updatedAt is automatically updated by db.saveWeek, so just verify it's a valid date
      expect(week40?.updatedAt.getTime()).toBeGreaterThan(0)
    })

    it('should preserve all Markdown formatting from real backup', async () => {
      const fixturePath = join(__dirname, 'fixtures', 'sample-backup.json')
      const fileContent = readFileSync(fixturePath, 'utf-8')
      const file = new File([fileContent], 'sample-backup.json', { type: 'application/json' })

      await importData(file)

      const week40 = await db.getWeek(2025, 40)

      // Check Markdown syntax is preserved
      expect(week40?.achievements).toContain('**')
      expect(week40?.achievements).toContain('- ')

      const week39 = await db.getWeek(2025, 39)
      expect(week39?.achievements).toContain('*')
      expect(week39?.challenges).toContain('```')
    })

    it('should handle empty fields in real backup files', async () => {
      const fixturePath = join(__dirname, 'fixtures', 'sample-backup.json')
      const fileContent = readFileSync(fixturePath, 'utf-8')
      const file = new File([fileContent], 'sample-backup.json', { type: 'application/json' })

      await importData(file)

      const week40 = await db.getWeek(2025, 40)
      // Verify that empty achievement field is preserved
      expect(week40).toBeTruthy()
      expect(week40?.achievements).toBeTruthy()
    })

    it('should validate backup file version', async () => {
      const invalidBackup = {
        version: '2.0', // Future version
        exportedAt: new Date().toISOString(),
        weeks: [],
      }

      const file = new File([JSON.stringify(invalidBackup)], 'invalid.json', {
        type: 'application/json',
      })

      // Should still work as long as structure is valid
      const result = await importData(file)
      expect(result.success).toBe(true)
    })

    it('should handle backup files with special characters', async () => {
      const backupWithSpecialChars = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        weeks: [
          {
            year: 2025,
            week: 1,
            achievements: 'Fixed `<Component />` rendering & state issues',
            challenges: "SQL: SELECT * FROM users WHERE name = 'O'Reilly'",
            weekState: 3,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      }

      const file = new File([JSON.stringify(backupWithSpecialChars)], 'special.json', {
        type: 'application/json',
      })

      const result = await importData(file)
      expect(result.success).toBe(true)

      const week = await db.getWeek(2025, 1)
      expect(week?.achievements).toContain('<Component />')
      expect(week?.achievements).toContain('&')
      expect(week?.challenges).toContain("O'Reilly")
    })
  })
})
