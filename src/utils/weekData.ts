import type { WeeklyData } from './db'

/**
 * Factory function to create an empty WeeklyData object
 * Ensures consistency across the application when initializing new week data
 */
export function createEmptyWeekData(year: number, week: number): WeeklyData {
  return {
    year,
    week,
    achievements: '',
    learnings: '',
    challenges: '',
    nextWeekFocus: '',
    weekState: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}
