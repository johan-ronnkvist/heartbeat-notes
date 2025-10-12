<template>
  <div class="simple-chart">
    <svg :viewBox="`0 0 ${width} ${height}`" :width="width" :height="height" class="chart-svg">
      <!-- Grid lines -->
      <g class="grid">
        <!-- Horizontal grid lines -->
        <line
          v-for="i in 6"
          :key="`grid-h-${i}`"
          :x1="padding.left"
          :y1="padding.top + ((i - 1) * chartHeight) / 5"
          :x2="width - padding.right"
          :y2="padding.top + ((i - 1) * chartHeight) / 5"
          stroke="#e5e7eb"
          stroke-width="1"
        />
        <!-- Vertical grid lines for each data point -->
        <line
          v-for="(point, index) in dataPoints"
          :key="`grid-v-${index}`"
          :x1="point.x"
          :y1="padding.top"
          :x2="point.x"
          :y2="padding.top + chartHeight"
          stroke="#e5e7eb"
          stroke-width="1"
        />
      </g>

      <!-- Area fill -->
      <path v-if="areaPath" :d="areaPath" fill="var(--color-sentiment-fill)" opacity="0.1" />

      <!-- Line path -->
      <path
        v-if="linePath"
        :d="linePath"
        fill="none"
        stroke="var(--color-sentiment-line)"
        stroke-width="3"
      />

      <!-- Data points with emojis -->
      <g class="data-points">
        <g
          v-for="(point, index) in dataPoints"
          :key="`point-${index}`"
          :transform="`translate(${point.x}, ${point.y})`"
        >
          <!-- Hover circle (invisible, for better hover area) -->
          <circle
            r="20"
            fill="transparent"
            class="hover-area"
            @mouseenter="hoveredIndex = index"
            @mouseleave="hoveredIndex = null"
            @click="handlePointClick(index)"
          />
          <!-- Emoji -->
          <text
            :font-size="hoveredIndex === index ? 38 : 34"
            text-anchor="middle"
            dominant-baseline="middle"
            class="emoji-point"
            :class="{ hovered: hoveredIndex === index }"
            @mouseenter="hoveredIndex = index"
            @mouseleave="hoveredIndex = null"
            @click="handlePointClick(index)"
          >
            {{ point.emoji }}
          </text>
        </g>
      </g>

      <!-- X-axis labels -->
      <g class="x-axis-labels">
        <text
          v-for="(label, index) in xLabels"
          :key="`label-${index}`"
          :x="padding.left + index * xStep"
          :y="height - padding.bottom + 20"
          text-anchor="middle"
          font-size="12"
          fill="#6b7280"
        >
          {{ label }}
        </text>
      </g>

      <!-- Tooltip -->
      <g v-if="hoveredIndex !== null" class="tooltip-group" style="pointer-events: none">
        <rect
          :x="dataPoints[hoveredIndex].x - 50"
          :y="dataPoints[hoveredIndex].y - 60"
          width="100"
          height="30"
          rx="4"
          fill="#1f2937"
        />
        <text
          :x="dataPoints[hoveredIndex].x"
          :y="dataPoints[hoveredIndex].y - 42"
          text-anchor="middle"
          font-size="13"
          fill="white"
          font-weight="600"
        >
          {{ tooltipText(hoveredIndex) }}
        </text>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { WeeklyData } from '@/utils/db'
import { WEEK_STATUS_EMOJIS } from '@/constants/sentiment'

interface Props {
  weeklyData: WeeklyData[]
  emojiScale: readonly string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  weekClick: [week: WeeklyData]
}>()

const hoveredIndex = ref<number | null>(null)

// Handle point click
const handlePointClick = (index: number) => {
  const weekData = props.weeklyData[index]
  if (weekData) {
    emit('weekClick', weekData)
  }
}

// Chart dimensions - use viewBox to make it responsive
const width = 1200
const height = 250
const padding = { top: 30, right: 50, bottom: 40, left: 50 }
const chartWidth = width - padding.left - padding.right
const chartHeight = height - padding.top - padding.bottom

// X-axis step
const xStep = computed(() => {
  const count = props.weeklyData.length
  return count > 1 ? chartWidth / (count - 1) : chartWidth / 2
})

// X-axis labels
const xLabels = computed(() => props.weeklyData.map((week) => `Week ${week.week}`))

// Scale value (1-5) to Y coordinate
const scaleY = (value: number): number => {
  // Value is 1-5, but chart displays 0-5 (so 1 appears one level above bottom)
  // This means value 1 maps to y position for "1" on a 0-5 scale
  const normalized = (5 - value) / 5 // Map 1-5 to positions 4/5 to 0/5 of chart height
  return padding.top + normalized * chartHeight
}

// Data points with coordinates
const dataPoints = computed(() => {
  return props.weeklyData
    .map((week, index) => {
      let value: number | null = null
      let emoji = ''

      if (typeof week.weekState === 'string') {
        // Status emoji - don't plot on sentiment scale
        emoji = WEEK_STATUS_EMOJIS[week.weekState as keyof typeof WEEK_STATUS_EMOJIS]
        value = null
      } else if (typeof week.weekState === 'number') {
        // Sentiment emoji
        value = week.weekState
        emoji = props.emojiScale[week.weekState - 1]
      }

      const x = padding.left + index * xStep.value

      return {
        x,
        y: value ? scaleY(value) : height / 2, // Center if no value
        value,
        emoji,
        hasValue: value !== null,
        year: week.year,
        week: week.week,
      }
    })
    .filter((p) => p.emoji) // Only include points with emojis
})

// Generate tooltip text
const tooltipText = (index: number): string => {
  const point = dataPoints.value[index]
  if (!point) return ''
  return `${point.year} • W${point.week}`
}

// Calculate monotone cubic spline control points (similar to Chart.js)
const getMonotoneCubicControlPoints = (
  points: Array<{ x: number; y: number }>,
): Array<{ cp1x: number; cp1y: number; cp2x: number; cp2y: number }> => {
  const n = points.length
  const result: Array<{ cp1x: number; cp1y: number; cp2x: number; cp2y: number }> = []

  if (n < 2) return result

  // Calculate slopes
  const deltas: number[] = []
  const slopes: number[] = []

  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x
    const dy = points[i + 1].y - points[i].y
    deltas[i] = dx
    slopes[i] = dy / dx
  }

  // Calculate tangents (monotone cubic spline)
  const tangents: number[] = [slopes[0]]

  for (let i = 1; i < n - 1; i++) {
    const m = (slopes[i - 1] + slopes[i]) / 2
    tangents[i] = m
  }

  tangents[n - 1] = slopes[n - 2]

  // Adjust tangents to maintain monotonicity
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(slopes[i]) < 1e-6) {
      tangents[i] = 0
      tangents[i + 1] = 0
    } else {
      const alpha = tangents[i] / slopes[i]
      const beta = tangents[i + 1] / slopes[i]
      const h = Math.hypot(alpha, beta)
      if (h > 3) {
        const t = 3 / h
        tangents[i] = t * alpha * slopes[i]
        tangents[i + 1] = t * beta * slopes[i]
      }
    }
  }

  // Calculate control points
  const tension = 0.4 // Match Chart.js tension
  for (let i = 0; i < n - 1; i++) {
    const dx = deltas[i]
    const cp1x = points[i].x + dx * tension
    const cp1y = points[i].y + tangents[i] * dx * tension
    const cp2x = points[i + 1].x - dx * tension
    const cp2y = points[i + 1].y - tangents[i + 1] * dx * tension

    result.push({ cp1x, cp1y, cp2x, cp2y })
  }

  return result
}

// Line path (only connecting points with values) with monotone cubic spline
const linePath = computed(() => {
  const points = dataPoints.value.filter((p) => p.hasValue)
  if (points.length < 2) return null

  const controlPoints = getMonotoneCubicControlPoints(points)
  let path = `M ${points[0].x} ${points[0].y}`

  for (let i = 0; i < controlPoints.length; i++) {
    const { cp1x, cp1y, cp2x, cp2y } = controlPoints[i]
    const endPoint = points[i + 1]
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endPoint.x} ${endPoint.y}`
  }

  return path
})

// Area path (fill under the line) with monotone cubic spline
const areaPath = computed(() => {
  const points = dataPoints.value.filter((p) => p.hasValue)
  if (points.length < 2) return null

  const bottomY = padding.top + chartHeight
  const controlPoints = getMonotoneCubicControlPoints(points)

  let path = `M ${points[0].x} ${bottomY}`
  path += ` L ${points[0].x} ${points[0].y}`

  for (let i = 0; i < controlPoints.length; i++) {
    const { cp1x, cp1y, cp2x, cp2y } = controlPoints[i]
    const endPoint = points[i + 1]
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endPoint.x} ${endPoint.y}`
  }

  path += ` L ${points[points.length - 1].x} ${bottomY}`
  path += ' Z'

  return path
})
</script>

<style scoped>
.simple-chart {
  width: 100%;
  height: 100%;
}

.chart-svg {
  width: 100%;
  height: 100%;
}

.emoji-point {
  cursor: pointer;
  transition: font-size 0.2s ease;
  user-select: none;
}

.emoji-point.hovered {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.hover-area {
  cursor: pointer;
}

:root {
  --color-sentiment-line: #dc2626;
  --color-sentiment-fill: #dc2626;
}

/* Use theme color if available */
.simple-chart {
  --color-sentiment-line: var(--color-theme-primary, #dc2626);
  --color-sentiment-fill: var(--color-theme-primary, #dc2626);
}
</style>
