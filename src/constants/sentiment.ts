/**
 * Sentiment scale configuration used throughout the application
 */

export const EMOJI_SCALE = ['😞', '😕', '😐', '🙂', '😄'] as const

export const SENTIMENT_LABELS = ['Challenging', 'Not Great', 'Okay', 'Good', 'Excellent'] as const

export type SentimentLevel = 1 | 2 | 3 | 4 | 5

/**
 * Week status emojis (shown when a week has a special status)
 */
export const WEEK_STATUS_EMOJIS = {
  vacation: '🏖️',
  sick: '🤒',
} as const

/**
 * Get emoji for a given sentiment level (1-5)
 */
export function getSentimentEmoji(level: SentimentLevel): string {
  return EMOJI_SCALE[level - 1]
}

/**
 * Get label for a given sentiment level (1-5)
 */
export function getSentimentLabel(level: SentimentLevel): string {
  return SENTIMENT_LABELS[level - 1]
}
