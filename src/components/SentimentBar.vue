<template>
  <div class="sentiment-bar-container">
    <div class="sentiment-bar">
      <div
        v-for="segment in segments"
        :key="segment.level"
        class="sentiment-bar-segment"
        :style="{
          width: `${segment.percentage}%`,
          backgroundColor: colors[segment.level - 1],
        }"
      >
        <span class="segment-emoji">{{ getEmoji(segment.level) }}</span>
        <div class="segment-tooltip">
          {{ getLabel(segment.level) }}: {{ segment.count }} week{{
            segment.count > 1 ? 's' : ''
          }}
          ({{ Math.round(segment.percentage) }}%)
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { EMOJI_SCALE, getSentimentLabel, type SentimentLevel } from '@/constants/sentiment'

interface Props {
  distribution: { level: number; count: number }[]
  totalCount: number
  colors: string[]
}

const props = defineProps<Props>()

const segments = computed(() => {
  return props.distribution.map((item) => ({
    level: item.level,
    count: item.count,
    percentage: (item.count / props.totalCount) * 100,
  }))
})

const getEmoji = (level: number): string => {
  return EMOJI_SCALE[level - 1]
}

const getLabel = (level: number): string => {
  return getSentimentLabel(level as SentimentLevel)
}
</script>

<style scoped>
.sentiment-bar-container {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
  position: relative;
}

.sentiment-bar {
  display: flex;
  height: 2rem;
  border-radius: 0.5rem;
  overflow: visible;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.sentiment-bar-segment {
  cursor: default;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.sentiment-bar-segment:first-child {
  border-top-left-radius: 0.5rem;
  border-bottom-left-radius: 0.5rem;
}

.sentiment-bar-segment:last-child {
  border-top-right-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
}

.sentiment-bar-segment:hover {
  filter: brightness(0.95);
}

.segment-emoji {
  font-size: 1.25rem;
  user-select: none;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.segment-tooltip {
  position: absolute;
  bottom: calc(100% + 0.5rem);
  left: 50%;
  transform: translateX(-50%);
  background: #1f2937;
  color: white;
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 10;
}

.sentiment-bar-segment:hover .segment-tooltip {
  opacity: 1;
}
</style>
