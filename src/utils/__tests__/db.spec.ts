import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db, type WeeklyData } from '../db'

describe('HeartbeatNotesDB', () => {
  beforeEach(async () => {
    // Clear the database before each test
    await db.init()
  })

  afterEach(async () => {
    // Clean up after each test
    const allWeeks = await db.getAllWeeks()
    for (const week of allWeeks) {
      await db.deleteWeek(week.year, week.week)
    }
  })

  describe('init', () => {
    it('should initialize the database', async () => {
      await expect(db.init()).resolves.toBeUndefined()
    })

    it('should be idempotent (can be called multiple times)', async () => {
      await db.init()
      await expect(db.init()).resolves.toBeUndefined()
    })
  })

  describe('saveWeek', () => {
    it('should save new week data', async () => {
      const weekData: WeeklyData = {
        year: 2025,
        week: 14,
        achievements: 'Achievement 1',
        challenges: 'Challenge 1',
        weekState: 4,
        createdAt: new Date('2025-04-01'),
        updatedAt: new Date('2025-04-01'),
      }

      await db.saveWeek(weekData)
      const retrieved = await db.getWeek(2025, 14)

      expect(retrieved).toBeTruthy()
      expect(retrieved?.year).toBe(2025)
      expect(retrieved?.week).toBe(14)
      expect(retrieved?.achievements).toBe('Achievement 1')
      expect(retrieved?.challenges).toBe('Challenge 1')
      expect(retrieved?.weekState).toBe(4)
    })

    it('should update existing week data', async () => {
      const weekData: WeeklyData = {
        year: 2025,
        week: 14,
        achievements: 'Achievement 1',
        challenges: '',
        weekState: 3,
        createdAt: new Date('2025-04-01'),
        updatedAt: new Date('2025-04-01'),
      }

      await db.saveWeek(weekData)

      const updatedData: WeeklyData = {
        ...weekData,
        achievements: 'Achievement 1\nAchievement 2',
        weekState: 5,
      }

      await db.saveWeek(updatedData)
      const retrieved = await db.getWeek(2025, 14)

      expect(retrieved?.achievements).toBe('Achievement 1\nAchievement 2')
      expect(retrieved?.weekState).toBe(5)
    })

    it('should auto-update updatedAt timestamp', async () => {
      const oldDate = new Date('2025-04-01')
      const weekData: WeeklyData = {
        year: 2025,
        week: 14,
        achievements: '',
        challenges: '',
        weekState: null,
        createdAt: oldDate,
        updatedAt: oldDate,
      }

      await db.saveWeek(weekData)
      const retrieved = await db.getWeek(2025, 14)

      expect(retrieved?.updatedAt.getTime()).toBeGreaterThan(oldDate.getTime())
    })

    it('should set createdAt if not provided', async () => {
      const weekData = {
        year: 2025,
        week: 14,
        achievements: '',
        challenges: '',
        weekState: null,
        createdAt: undefined,
        updatedAt: undefined,
      } as unknown as WeeklyData

      await db.saveWeek(weekData)
      const retrieved = await db.getWeek(2025, 14)

      expect(retrieved?.createdAt).toBeInstanceOf(Date)
    })
  })

  describe('getWeek', () => {
    it('should return null for non-existent week', async () => {
      const result = await db.getWeek(2025, 99)
      expect(result).toBeNull()
    })

    it('should retrieve existing week data', async () => {
      const weekData: WeeklyData = {
        year: 2025,
        week: 14,
        achievements: 'Test',
        challenges: '',
        weekState: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.saveWeek(weekData)
      const retrieved = await db.getWeek(2025, 14)

      expect(retrieved).toBeTruthy()
      expect(retrieved?.year).toBe(2025)
      expect(retrieved?.week).toBe(14)
    })

    it('should handle different year/week combinations', async () => {
      await db.saveWeek({
        year: 2024,
        week: 52,
        achievements: '2024-W52',
        challenges: '',
        weekState: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await db.saveWeek({
        year: 2025,
        week: 1,
        achievements: '2025-W01',
        challenges: '',
        weekState: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const week2024 = await db.getWeek(2024, 52)
      const week2025 = await db.getWeek(2025, 1)

      expect(week2024?.achievements).toBe('2024-W52')
      expect(week2025?.achievements).toBe('2025-W01')
    })
  })

  describe('deleteWeek', () => {
    it('should delete existing week data', async () => {
      const weekData: WeeklyData = {
        year: 2025,
        week: 14,
        achievements: '',
        challenges: '',
        weekState: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.saveWeek(weekData)
      expect(await db.getWeek(2025, 14)).toBeTruthy()

      await db.deleteWeek(2025, 14)
      expect(await db.getWeek(2025, 14)).toBeNull()
    })

    it('should handle deleting non-existent week', async () => {
      await expect(db.deleteWeek(2025, 99)).resolves.toBeUndefined()
    })
  })

  describe('getWeeksByYear', () => {
    it('should return empty array for year with no data', async () => {
      const weeks = await db.getWeeksByYear(2025)
      expect(weeks).toEqual([])
    })

    it('should return all weeks for a specific year', async () => {
      await db.saveWeek({
        year: 2025,
        week: 1,
        achievements: '',
        challenges: '',
        weekState: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await db.saveWeek({
        year: 2025,
        week: 2,
        achievements: '',
        challenges: '',
        weekState: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await db.saveWeek({
        year: 2024,
        week: 52,
        achievements: '',
        challenges: '',
        weekState: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const weeks2025 = await db.getWeeksByYear(2025)
      expect(weeks2025).toHaveLength(2)
      expect(weeks2025.every((w) => w.year === 2025)).toBe(true)
    })
  })

  describe('getAllWeeks', () => {
    it('should return empty array when no data exists', async () => {
      const weeks = await db.getAllWeeks()
      expect(weeks).toEqual([])
    })

    it('should return all weeks across all years', async () => {
      await db.saveWeek({
        year: 2024,
        week: 52,
        achievements: '',
        challenges: '',
        weekState: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await db.saveWeek({
        year: 2025,
        week: 1,
        achievements: '',
        challenges: '',
        weekState: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await db.saveWeek({
        year: 2025,
        week: 2,
        achievements: '',
        challenges: '',
        weekState: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const allWeeks = await db.getAllWeeks()
      expect(allWeeks).toHaveLength(3)
    })
  })

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock indexedDB.open to throw an error
      const mockOpen = vi.fn().mockImplementationOnce(() => {
        const request = {
          error: new Error('Database error'),
          onerror: null as ((this: IDBRequest, ev: Event) => unknown) | null,
          onsuccess: null as ((this: IDBRequest, ev: Event) => unknown) | null,
          onupgradeneeded: null as
            | ((this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) => unknown)
            | null,
        }
        setTimeout(() => {
          if (request.onerror) {
            request.onerror.call(request as unknown as IDBRequest, new Event('error'))
          }
        }, 0)
        return request
      })

      const originalOpen = indexedDB.open
      indexedDB.open = mockOpen as typeof indexedDB.open

      // Force re-initialization
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(db as any).db = null

      await expect(db.init()).rejects.toThrow('Database error')

      // Restore
      indexedDB.open = originalOpen
    })
  })

  describe('HTML rich text preservation', () => {
    it('should preserve bold text in achievements', async () => {
      const htmlContent = '<p><strong>Bold achievement</strong> with normal text</p>'
      const weekData: WeeklyData = {
        year: 2025,
        week: 20,
        achievements: htmlContent,
        challenges: '',
        weekState: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.saveWeek(weekData)
      const retrieved = await db.getWeek(2025, 20)

      expect(retrieved?.achievements).toBe(htmlContent)
    })

    it('should preserve italic and strikethrough formatting', async () => {
      const htmlContent = '<p><em>Italic text</em> and <s>strikethrough text</s></p>'
      const weekData: WeeklyData = {
        year: 2025,
        week: 21,
        achievements: htmlContent,
        challenges: '',
        weekState: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.saveWeek(weekData)
      const retrieved = await db.getWeek(2025, 21)

      expect(retrieved?.achievements).toBe(htmlContent)
    })

    it('should preserve code blocks', async () => {
      const htmlContent = '<pre><code>const x = 10;\nconsole.log(x);</code></pre>'
      const weekData: WeeklyData = {
        year: 2025,
        week: 22,
        achievements: '',
        challenges: htmlContent,
        weekState: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.saveWeek(weekData)
      const retrieved = await db.getWeek(2025, 22)

      expect(retrieved?.challenges).toBe(htmlContent)
    })

    it('should preserve bullet and numbered lists', async () => {
      const bulletList = '<ul><li>First item</li><li>Second item</li></ul>'
      const numberedList = '<ol><li>Step one</li><li>Step two</li></ol>'
      const weekData: WeeklyData = {
        year: 2025,
        week: 23,
        achievements: bulletList,
        challenges: numberedList,
        weekState: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.saveWeek(weekData)
      const retrieved = await db.getWeek(2025, 23)

      expect(retrieved?.achievements).toBe(bulletList)
      expect(retrieved?.challenges).toBe(numberedList)
    })

    it('should preserve task lists with checkboxes', async () => {
      const taskList =
        '<ul data-type="taskList"><li data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>Completed task</p></div></li><li data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Pending task</p></div></li></ul>'
      const weekData: WeeklyData = {
        year: 2025,
        week: 24,
        achievements: taskList,
        challenges: '',
        weekState: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.saveWeek(weekData)
      const retrieved = await db.getWeek(2025, 24)

      expect(retrieved?.achievements).toBe(taskList)
    })

    it('should preserve headings', async () => {
      const htmlContent =
        '<h2>Main Section</h2><p>Content here</p><h3>Subsection</h3><p>More content</p>'
      const weekData: WeeklyData = {
        year: 2025,
        week: 25,
        achievements: htmlContent,
        challenges: '',
        weekState: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.saveWeek(weekData)
      const retrieved = await db.getWeek(2025, 25)

      expect(retrieved?.achievements).toBe(htmlContent)
    })

    it('should preserve complex mixed formatting', async () => {
      const complexHtml =
        '<h2>Weekly Summary</h2><p><strong>Bold</strong> and <em>italic</em> text</p><ul><li>Bullet point with <s>strikethrough</s></li><li>Another point</li></ul><pre><code>function test() {\n  return true;\n}</code></pre>'
      const weekData: WeeklyData = {
        year: 2025,
        week: 26,
        achievements: '',
        challenges: complexHtml,
        weekState: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.saveWeek(weekData)
      const retrieved = await db.getWeek(2025, 26)

      expect(retrieved?.challenges).toBe(complexHtml)
    })

    it('should preserve special characters and entities in HTML', async () => {
      const htmlWithEntities = '<p>Code snippet: &lt;div&gt;Hello &amp; goodbye&lt;/div&gt;</p>'
      const weekData: WeeklyData = {
        year: 2025,
        week: 27,
        achievements: htmlWithEntities,
        challenges: '',
        weekState: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.saveWeek(weekData)
      const retrieved = await db.getWeek(2025, 27)

      expect(retrieved?.achievements).toBe(htmlWithEntities)
    })

    it('should preserve multiple HTML sections concatenated', async () => {
      const achievement1 = '<p><strong>First achievement</strong></p>'
      const achievement2 = '<p><em>Second achievement</em></p>'
      const achievement3 =
        '<ul><li>Third achievement item 1</li><li>Third achievement item 2</li></ul>'
      const combinedAchievements = achievement1 + achievement2 + achievement3

      const weekData: WeeklyData = {
        year: 2025,
        week: 28,
        achievements: combinedAchievements,
        challenges: '',
        weekState: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await db.saveWeek(weekData)
      const retrieved = await db.getWeek(2025, 28)

      expect(retrieved?.achievements).toBe(combinedAchievements)
      expect(retrieved?.achievements).toContain(achievement1)
      expect(retrieved?.achievements).toContain(achievement2)
      expect(retrieved?.achievements).toContain(achievement3)
    })
  })
})
