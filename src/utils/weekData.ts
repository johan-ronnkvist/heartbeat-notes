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
    challenges: '',
    weekState: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}
