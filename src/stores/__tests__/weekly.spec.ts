import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWeeklyStore } from '../weekly'
import { db, type WeeklyData } from '@/utils/db'

describe('useWeeklyStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(async () => {
    // Clean up database
    const allWeeks = await db.getAllWeeks()
    for (const week of allWeeks) {
      await db.deleteWeek(week.year, week.week)
    }
  })

  describe('initialization', () => {
    it('should initialize with null currentWeekData', () => {
      const store = useWeeklyStore()
      expect(store.currentWeekData).toBeNull()
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('should compute current week correctly', () => {
      const store = useWeeklyStore()
      expect(store.currentWeek.year).toBeGreaterThan(2020)
      expect(store.currentWeek.week).toBeGreaterThan(0)
      expect(store.currentWeek.week).toBeLessThanOrEqual(53)
    })
  })

  describe('loadCurrentWeek', () => {
    it('should load existing week data', async () => {
      const store = useWeeklyStore()
      const { year, week } = store.currentWeek

      const testData: WeeklyData = {
        year,
        week,
        achievements: 'Test achievement',
        challenges: 'Test challenge',
        weekState: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.saveWeek(testData)
      await store.loadCurrentWeek()

      expect(store.currentWeekData).toBeTruthy()
      expect(store.currentWeekData?.achievements).toBe('Test achievement')
      expect(store.currentWeekData?.challenges).toBe('Test challenge')
      expect(store.currentWeekData?.weekState).toBe(4)
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('should initialize empty week data if none exists', async () => {
      const store = useWeeklyStore()
      await store.loadCurrentWeek()

      expect(store.currentWeekData).toBeTruthy()
      expect(store.currentWeekData?.achievements).toBe('')
      expect(store.currentWeekData?.challenges).toBe('')
      expect(store.currentWeekData?.weekState).toBeNull()
      expect(store.isLoading).toBe(false)
    })

    it('should set loading state during operation', async () => {
      const store = useWeeklyStore()

      const loadPromise = store.loadCurrentWeek()
      expect(store.isLoading).toBe(true)

      await loadPromise
      expect(store.isLoading).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      const store = useWeeklyStore()

      // Mock db.getWeek to throw an error
      const originalGetWeek = db.getWeek
      vi.spyOn(db, 'getWeek').mockRejectedValueOnce(new Error('Database error'))

      await store.loadCurrentWeek()

      expect(store.error).toBe('Database error')
      expect(store.isLoading).toBe(false)

      // Restore
      db.getWeek = originalGetWeek
    })

    it('should handle non-Error exceptions', async () => {
      const store = useWeeklyStore()

      vi.spyOn(db, 'getWeek').mockRejectedValueOnce('String error')

      await store.loadCurrentWeek()

      expect(store.error).toBe('Failed to load week data')
    })
  })

  describe('loadWeek', () => {
    it('should load specific week data', async () => {
      const store = useWeeklyStore()

      const testData: WeeklyData = {
        year: 2024,
        week: 52,
        achievements: 'Year-end achievement',
        challenges: '',
        weekState: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.saveWeek(testData)
      await store.loadWeek(2024, 52)

      expect(store.currentWeekData?.year).toBe(2024)
      expect(store.currentWeekData?.week).toBe(52)
      expect(store.currentWeekData?.achievements).toBe('Year-end achievement')
    })

    it('should initialize empty data for non-existent week', async () => {
      const store = useWeeklyStore()
      await store.loadWeek(2023, 1)

      expect(store.currentWeekData?.year).toBe(2023)
      expect(store.currentWeekData?.week).toBe(1)
      expect(store.currentWeekData?.achievements).toBe('')
    })

    it('should handle errors', async () => {
      const store = useWeeklyStore()

      vi.spyOn(db, 'getWeek').mockRejectedValueOnce(new Error('Load error'))

      await store.loadWeek(2025, 1)

      expect(store.error).toBe('Load error')
    })
  })

  describe('saveCurrentWeek', () => {
    it('should save current week data', async () => {
      const store = useWeeklyStore()
      await store.loadCurrentWeek()

      store.updateAchievements('New achievement')
      await store.saveCurrentWeek()

      const { year, week } = store.currentWeek
      const saved = await db.getWeek(year, week)

      expect(saved?.achievements).toBe('New achievement')
    })

    it('should do nothing if currentWeekData is null', async () => {
      const store = useWeeklyStore()
      expect(store.currentWeekData).toBeNull()

      await expect(store.saveCurrentWeek()).resolves.toBeUndefined()
    })

    it('should set loading state during save', async () => {
      const store = useWeeklyStore()
      await store.loadCurrentWeek()

      const savePromise = store.saveCurrentWeek()
      expect(store.isLoading).toBe(true)

      await savePromise
      expect(store.isLoading).toBe(false)
    })

    it('should handle save errors', async () => {
      const store = useWeeklyStore()
      await store.loadCurrentWeek()

      vi.spyOn(db, 'saveWeek').mockRejectedValueOnce(new Error('Save failed'))

      await expect(store.saveCurrentWeek()).rejects.toThrow('Save failed')
      expect(store.error).toBe('Save failed')
    })

    it('should handle non-Error exceptions during save', async () => {
      const store = useWeeklyStore()
      await store.loadCurrentWeek()

      vi.spyOn(db, 'saveWeek').mockRejectedValueOnce('String error')

      await expect(store.saveCurrentWeek()).rejects.toThrow()
      expect(store.error).toBe('Failed to save week data')
    })
  })

  describe('updateAchievements', () => {
    it('should update achievements for current week', async () => {
      const store = useWeeklyStore()
      await store.loadCurrentWeek()

      store.updateAchievements('Achievement 1')
      expect(store.currentWeekData?.achievements).toBe('Achievement 1')

      store.updateAchievements('Achievement 1 and 2')
      expect(store.currentWeekData?.achievements).toBe('Achievement 1 and 2')
    })

    it('should do nothing if currentWeekData is null', () => {
      const store = useWeeklyStore()
      expect(store.currentWeekData).toBeNull()

      store.updateAchievements('Should not add')
      expect(store.currentWeekData).toBeNull()
    })
  })

  describe('updateChallenges', () => {
    it('should update challenges for current week', async () => {
      const store = useWeeklyStore()
      await store.loadCurrentWeek()

      store.updateChallenges('Challenge 1')
      expect(store.currentWeekData?.challenges).toBe('Challenge 1')

      store.updateChallenges('Challenge 1 and 2')
      expect(store.currentWeekData?.challenges).toBe('Challenge 1 and 2')
    })

    it('should do nothing if currentWeekData is null', () => {
      const store = useWeeklyStore()
      expect(store.currentWeekData).toBeNull()

      store.updateChallenges('Should not add')
      expect(store.currentWeekData).toBeNull()
    })
  })

  describe('updateSentiment', () => {
    it('should update sentiment level for current week', async () => {
      const store = useWeeklyStore()
      await store.loadCurrentWeek()

      store.updateSentiment(5)
      expect(store.currentWeekData?.weekState).toBe(5)

      store.updateSentiment(1)
      expect(store.currentWeekData?.weekState).toBe(1)

      store.updateSentiment(null)
      expect(store.currentWeekData?.weekState).toBeNull()
    })

    it('should do nothing if currentWeekData is null', () => {
      const store = useWeeklyStore()
      expect(store.currentWeekData).toBeNull()

      store.updateSentiment(3)
      expect(store.currentWeekData).toBeNull()
    })
  })

  describe('integration', () => {
    it('should support full workflow: load, modify, save, reload', async () => {
      const store = useWeeklyStore()

      // Load current week
      await store.loadCurrentWeek()
      const { year, week } = store.currentWeek

      // Modify data
      store.updateAchievements('Completed feature X')
      store.updateChallenges('Debugging IndexedDB')
      store.updateSentiment(4)

      // Save
      await store.saveCurrentWeek()

      // Create new store instance and reload
      const newStore = useWeeklyStore()
      await newStore.loadWeek(year, week)

      // Verify data persisted
      expect(newStore.currentWeekData?.achievements).toBe('Completed feature X')
      expect(newStore.currentWeekData?.challenges).toBe('Debugging IndexedDB')
      expect(newStore.currentWeekData?.weekState).toBe(4)
    })

    it('should handle multiple weeks independently', async () => {
      const store = useWeeklyStore()

      // Week 1
      await store.loadWeek(2025, 1)
      store.updateAchievements('Week 1 achievement')
      await store.saveCurrentWeek()

      // Week 2
      await store.loadWeek(2025, 2)
      store.updateAchievements('Week 2 achievement')
      await store.saveCurrentWeek()

      // Verify independence
      await store.loadWeek(2025, 1)
      expect(store.currentWeekData?.achievements).toBe('Week 1 achievement')

      await store.loadWeek(2025, 2)
      expect(store.currentWeekData?.achievements).toBe('Week 2 achievement')
    })
  })

  describe('HTML rich text preservation in store', () => {
    it('should preserve HTML formatting in achievements through save/load cycle', async () => {
      const store = useWeeklyStore()
      await store.loadCurrentWeek()

      const htmlAchievement = '<p><strong>Completed</strong> the <em>critical</em> feature!</p>'
      store.updateAchievements(htmlAchievement)
      await store.saveCurrentWeek()

      const newStore = useWeeklyStore()
      await newStore.loadWeek(store.currentWeek.year, store.currentWeek.week)

      expect(newStore.currentWeekData?.achievements).toBe(htmlAchievement)
    })

    it('should preserve HTML formatting in achievements with code blocks', async () => {
      const store = useWeeklyStore()
      await store.loadWeek(2025, 30)

      const htmlAchievement =
        '<p>Learned how to use IndexedDB:</p><pre><code>const db = indexedDB.open("myDB", 1);</code></pre>'
      store.updateAchievements(htmlAchievement)
      await store.saveCurrentWeek()

      const newStore = useWeeklyStore()
      await newStore.loadWeek(2025, 30)

      expect(newStore.currentWeekData?.achievements).toBe(htmlAchievement)
    })

    it('should preserve HTML formatting in challenges with lists', async () => {
      const store = useWeeklyStore()
      await store.loadWeek(2025, 31)

      const htmlChallenge =
        '<p>Multiple issues:</p><ul><li>Bug in <code>saveWeek()</code></li><li>Performance problem</li></ul>'
      store.updateChallenges(htmlChallenge)
      await store.saveCurrentWeek()

      const newStore = useWeeklyStore()
      await newStore.loadWeek(2025, 31)

      expect(newStore.currentWeekData?.challenges).toBe(htmlChallenge)
    })

    it('should preserve HTML formatting in challenges with task lists', async () => {
      const store = useWeeklyStore()
      await store.loadWeek(2025, 32)

      const htmlTaskList =
        '<ul data-type="taskList"><li data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Review PR</p></div></li></ul>'
      store.updateChallenges(htmlTaskList)
      await store.saveCurrentWeek()

      const newStore = useWeeklyStore()
      await newStore.loadWeek(2025, 32)

      expect(newStore.currentWeekData?.challenges).toBe(htmlTaskList)
    })

    it('should preserve HTML entities and special characters', async () => {
      const store = useWeeklyStore()
      await store.loadWeek(2025, 33)

      const htmlWithEntities = '<p>Fixed: &lt;Component /&gt; rendering &amp; state issues</p>'
      store.updateAchievements(htmlWithEntities)
      await store.saveCurrentWeek()

      const newStore = useWeeklyStore()
      await newStore.loadWeek(2025, 33)

      expect(newStore.currentWeekData?.achievements).toBe(htmlWithEntities)
    })

    it('should preserve multiple HTML sections concatenated with different formatting', async () => {
      const store = useWeeklyStore()
      await store.loadWeek(2025, 34)

      const html1 = '<p><strong>Bold achievement</strong></p>'
      const html2 = '<p><em>Italic achievement</em></p>'
      const html3 = '<ul><li>List item 1</li><li>List item 2</li></ul>'
      const combinedHtml = html1 + html2 + html3

      store.updateAchievements(combinedHtml)
      await store.saveCurrentWeek()

      const newStore = useWeeklyStore()
      await newStore.loadWeek(2025, 34)

      expect(newStore.currentWeekData?.achievements).toBe(combinedHtml)
      expect(newStore.currentWeekData?.achievements).toContain(html1)
      expect(newStore.currentWeekData?.achievements).toContain(html2)
      expect(newStore.currentWeekData?.achievements).toContain(html3)
    })

    it('should preserve complex nested HTML structures', async () => {
      const store = useWeeklyStore()
      await store.loadWeek(2025, 35)

      const complexHtml =
        '<h2>Major Milestone</h2><p>Shipped v2.0 with:</p><ol><li><strong>New features</strong>: <ul><li>Feature A</li><li>Feature B</li></ul></li><li><em>Bug fixes</em></li></ol><pre><code>git tag v2.0.0</code></pre>'
      store.updateAchievements(complexHtml)
      await store.saveCurrentWeek()

      const newStore = useWeeklyStore()
      await newStore.loadWeek(2025, 35)

      expect(newStore.currentWeekData?.achievements).toBe(complexHtml)
    })
  })

  describe('exportData', () => {
    it('should export data successfully', async () => {
      const store = useWeeklyStore()
      await store.loadCurrentWeek()

      store.updateAchievements('Test export')
      await store.saveCurrentWeek()

      await expect(store.exportData()).resolves.toBeUndefined()
      expect(store.error).toBeNull()
    })

    it('should handle export errors', async () => {
      const store = useWeeklyStore()

      // Mock exportAllData at the module level to throw an error
      const exportImport = await import('@/utils/exportImport')
      const exportSpy = vi
        .spyOn(exportImport, 'exportAllData')
        .mockRejectedValueOnce(new Error('Export failed'))

      await expect(store.exportData()).rejects.toThrow('Export failed')
      expect(store.error).toBe('Export failed')

      exportSpy.mockRestore()
    })

    it('should handle non-Error exceptions during export', async () => {
      const store = useWeeklyStore()

      const exportImport = await import('@/utils/exportImport')
      const exportSpy = vi
        .spyOn(exportImport, 'exportAllData')
        .mockRejectedValueOnce('String error')

      await expect(store.exportData()).rejects.toThrow()
      expect(store.error).toBe('Failed to export data')

      exportSpy.mockRestore()
    })
  })

  describe('importDataFromFile', () => {
    it('should import data successfully', async () => {
      const store = useWeeklyStore()

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        weeks: [
          {
            year: 2025,
            week: 40,
            achievements: 'Imported achievement',
            challenges: '',
            weekState: 5,
            createdAt: new Date('2025-10-01'),
            updatedAt: new Date('2025-10-01'),
          },
        ],
      }

      const file = new File([JSON.stringify(exportData)], 'backup.json', {
        type: 'application/json',
      })

      const result = await store.importDataFromFile(file)

      expect(result.success).toBe(true)
      expect(result.weeksImported).toBe(1)
      expect(store.error).toBeNull()

      // Verify data was imported
      const week = await db.getWeek(2025, 40)
      expect(week?.achievements).toBe('Imported achievement')
    })

    it('should reload current week after successful import', async () => {
      const store = useWeeklyStore()
      const { year, week } = store.currentWeek

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        weeks: [
          {
            year,
            week,
            achievements: 'Current week imported',
            challenges: '',
            weekState: 3,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      }

      const file = new File([JSON.stringify(exportData)], 'backup.json', {
        type: 'application/json',
      })

      await store.importDataFromFile(file)

      // Current week data should be updated
      expect(store.currentWeekData?.achievements).toBe('Current week imported')
      expect(store.currentWeekData?.weekState).toBe(3)
    })

    it('should set loading state during import', async () => {
      const store = useWeeklyStore()

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        weeks: [],
      }

      const file = new File([JSON.stringify(exportData)], 'backup.json', {
        type: 'application/json',
      })

      const importPromise = store.importDataFromFile(file)
      expect(store.isLoading).toBe(true)

      await importPromise
      expect(store.isLoading).toBe(false)
    })

    it('should handle import errors', async () => {
      const store = useWeeklyStore()

      const invalidFile = new File(['invalid json'], 'backup.json', {
        type: 'application/json',
      })

      await expect(store.importDataFromFile(invalidFile)).rejects.toThrow()
      expect(store.error).toBeTruthy()
      expect(store.isLoading).toBe(false)
    })

    it('should handle invalid backup format', async () => {
      const store = useWeeklyStore()

      const invalidData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        // Missing weeks array
      }

      const file = new File([JSON.stringify(invalidData)], 'backup.json', {
        type: 'application/json',
      })

      await expect(store.importDataFromFile(file)).rejects.toThrow()
      expect(store.error).toBe('Invalid backup file format')
    })

    it('should preserve HTML formatting during import', async () => {
      const store = useWeeklyStore()

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        weeks: [
          {
            year: 2025,
            week: 41,
            achievements: '<p><strong>Bold imported text</strong></p>',
            challenges: '<pre><code>code block</code></pre>',
            weekState: 4,
            createdAt: new Date('2025-10-08'),
            updatedAt: new Date('2025-10-08'),
          },
        ],
      }

      const file = new File([JSON.stringify(exportData)], 'backup.json', {
        type: 'application/json',
      })

      await store.importDataFromFile(file)

      const week = await db.getWeek(2025, 41)
      expect(week?.achievements).toBe('<p><strong>Bold imported text</strong></p>')
      expect(week?.challenges).toBe('<pre><code>code block</code></pre>')
    })
  })

  describe('export/import integration', () => {
    it('should support full export-import cycle through store methods', async () => {
      const store = useWeeklyStore()

      // Create test data
      await store.loadWeek(2025, 50)
      store.updateAchievements('<p><strong>Week 50 achievement</strong></p>')
      store.updateChallenges('<ul><li>Challenge 1</li></ul>')
      store.updateSentiment(5)
      await store.saveCurrentWeek()

      await store.loadWeek(2025, 51)
      store.updateChallenges('<pre><code>const x = 1;</code></pre>')
      await store.saveCurrentWeek()

      // Export data (we'll capture the blob)
      const { exportAllData } = await import('@/utils/exportImport')
      const blob = await exportAllData()
      const text = await blob.text()

      // Clear database
      await db.deleteWeek(2025, 50)
      await db.deleteWeek(2025, 51)

      // Import data
      const file = new File([text], 'backup.json', { type: 'application/json' })
      const result = await store.importDataFromFile(file)

      expect(result.success).toBe(true)
      expect(result.weeksImported).toBe(2)

      // Verify data
      await store.loadWeek(2025, 50)
      expect(store.currentWeekData?.achievements).toBe(
        '<p><strong>Week 50 achievement</strong></p>',
      )
      expect(store.currentWeekData?.challenges).toBe('<ul><li>Challenge 1</li></ul>')
      expect(store.currentWeekData?.weekState).toBe(5)

      await store.loadWeek(2025, 51)
      expect(store.currentWeekData?.challenges).toBe('<pre><code>const x = 1;</code></pre>')
    })
  })
})
