/**
 * Simple IndexedDB wrapper for Heartbeat weekly data storage
 */

const DB_NAME = 'heartbeat-db'
const DB_VERSION = 7
const STORE_NAME = 'weeks'

export type WeekStatus = 'vacation' | 'sick' | 'other'
export type WeekState = number | WeekStatus | null

export interface WeeklyData {
  year: number
  week: number
  achievements: string
  challenges: string
  weekState: WeekState
  createdAt: Date
  updatedAt: Date
}

export interface WeekKey {
  year: number
  week: number
}

class HeartbeatDB {
  private db: IDBDatabase | null = null

  /**
   * Initialize the database connection
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const transaction = (event.target as IDBOpenDBRequest).transaction!
        const oldVersion = event.oldVersion

        // Create object store with composite key [year, week]
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: ['year', 'week'] })

          // Create index for querying by year
          store.createIndex('year', 'year', { unique: false })
        } else if (oldVersion < 3) {
          // Migrate data from version 2 (arrays) to version 3 (strings)
          const store = transaction.objectStore(STORE_NAME)
          const getAllRequest = store.getAll()

          getAllRequest.onsuccess = () => {
            const allRecords = getAllRequest.result as Array<
              Record<string, string | string[] | number | Date | null>
            >
            allRecords.forEach((record) => {
              // Convert arrays to strings
              const migratedRecord = {
                ...record,
                achievements: Array.isArray(record.achievements)
                  ? record.achievements.join('\n')
                  : record.achievements || '',
                learnings: Array.isArray(record.learnings)
                  ? record.learnings.join('\n')
                  : record.learnings || '',
                challenges: Array.isArray(record.challenges)
                  ? record.challenges.join('\n')
                  : record.challenges || '',
              }
              store.put(migratedRecord)
            })
          }
        } else if (oldVersion < 4) {
          // Migrate data from version 3 to version 4 (add weekStatus field)
          const store = transaction.objectStore(STORE_NAME)
          const getAllRequest = store.getAll()

          getAllRequest.onsuccess = () => {
            const allRecords = getAllRequest.result as Array<
              Record<string, string | number | Date | null>
            >
            allRecords.forEach((record) => {
              const migratedRecord = {
                ...record,
                weekStatus: record.weekStatus ?? null,
              }
              // Remove weekStatusNote if it exists (from earlier migration attempt)
              if ('weekStatusNote' in migratedRecord) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                delete (migratedRecord as any).weekStatusNote
              }
              store.put(migratedRecord)
            })
          }
        }

        if (oldVersion < 5) {
          // Migrate from version 4 to version 5 (combine sentiment and weekStatus into weekState)
          const store = transaction.objectStore(STORE_NAME)
          const getAllRequest = store.getAll()

          getAllRequest.onsuccess = () => {
            const allRecords = getAllRequest.result as Array<
              Record<string, string | number | Date | null>
            >
            allRecords.forEach((record) => {
              // Priority: weekStatus > sentiment > null
              let weekState: WeekState = null
              if (record.weekStatus && typeof record.weekStatus === 'string') {
                weekState = record.weekStatus as WeekStatus
              } else if (record.sentiment && typeof record.sentiment === 'number') {
                weekState = record.sentiment
              }

              const migratedRecord = {
                year: record.year,
                week: record.week,
                achievements: record.achievements,
                learnings: record.learnings,
                challenges: record.challenges,
                nextWeekFocus: record.nextWeekFocus,
                weekState,
                createdAt: record.createdAt,
                updatedAt: record.updatedAt,
              }

              store.put(migratedRecord)
            })
          }
        }

        if (oldVersion < 6) {
          // Migrate from version 5 to version 6 (remove nextWeekFocus field)
          const store = transaction.objectStore(STORE_NAME)
          const getAllRequest = store.getAll()

          getAllRequest.onsuccess = () => {
            const allRecords = getAllRequest.result as Array<
              Record<string, string | number | Date | WeekState>
            >
            allRecords.forEach((record) => {
              const migratedRecord = {
                year: record.year,
                week: record.week,
                achievements: record.achievements,
                learnings: record.learnings,
                challenges: record.challenges,
                weekState: record.weekState,
                createdAt: record.createdAt,
                updatedAt: record.updatedAt,
              }

              store.put(migratedRecord)
            })
          }
        }

        if (oldVersion < 7) {
          // Migrate from version 6 to version 7 (remove learnings field)
          const store = transaction.objectStore(STORE_NAME)
          const getAllRequest = store.getAll()

          getAllRequest.onsuccess = () => {
            const allRecords = getAllRequest.result as Array<
              Record<string, string | number | Date | WeekState>
            >
            allRecords.forEach((record) => {
              const migratedRecord: WeeklyData = {
                year: record.year as number,
                week: record.week as number,
                achievements: record.achievements as string,
                challenges: record.challenges as string,
                weekState: record.weekState as WeekState,
                createdAt: record.createdAt as Date,
                updatedAt: record.updatedAt as Date,
              }

              store.put(migratedRecord)
            })
          }
        }
      }
    })
  }

  /**
   * Get weekly data for a specific year and week
   */
  async getWeek(year: number, week: number): Promise<WeeklyData | null> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get([year, week])

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  }

  /**
   * Save or update weekly data
   */
  async saveWeek(data: WeeklyData): Promise<void> {
    if (!this.db) await this.init()

    const weekData = {
      ...data,
      updatedAt: new Date(),
      createdAt: data.createdAt || new Date(),
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(weekData)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  /**
   * Delete weekly data
   */
  async deleteWeek(year: number, week: number): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete([year, week])

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  /**
   * Get all weeks for a specific year
   */
  async getWeeksByYear(year: number): Promise<WeeklyData[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index('year')
      const request = index.getAll(year)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || [])
    })
  }

  /**
   * Get all weeks
   */
  async getAllWeeks(): Promise<WeeklyData[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || [])
    })
  }

  /**
   * Get all unique years that have data
   */
  async getYearsWithData(): Promise<number[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index('year')
      const request = index.getAllKeys()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        // Extract unique years from composite keys [year, week]
        const years = new Set<number>()
        request.result.forEach((key) => {
          if (Array.isArray(key)) {
            years.add(key[0] as number)
          }
        })
        resolve(Array.from(years).sort((a, b) => b - a)) // Sort descending (newest first)
      }
    })
  }
}

// Export singleton instance
export const db = new HeartbeatDB()
