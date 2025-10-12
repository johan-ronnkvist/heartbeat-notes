<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <h1 class="app-title">Heartbeat Notes</h1>
      <p class="app-subtitle">Weekly Reflections</p>
    </div>

    <nav class="sidebar-nav">
      <ul class="nav-list">
        <li class="nav-item">
          <router-link to="/home" class="nav-link">
            <Home class="nav-icon" />
            Home
          </router-link>
        </li>
        <li class="nav-item">
          <router-link to="/notes" class="nav-link">
            <NotebookPen class="nav-icon" />
            Notes
          </router-link>
        </li>
        <li class="nav-item">
          <router-link
            to="/review"
            class="nav-link"
            :class="{ 'has-subnav': availableYears.length > 0 }"
          >
            <Calendar class="nav-icon" />
            Review
          </router-link>
          <ul v-if="availableYears.length > 0 && isReviewActive" class="subnav-list">
            <li v-for="year in availableYears" :key="year" class="subnav-item">
              <router-link :to="`/review/${year}`" class="subnav-link">
                {{ formatYearForDisplay(year) }}
              </router-link>
            </li>
          </ul>
        </li>
        <li class="nav-item">
          <router-link to="/settings" class="nav-link">
            <Settings class="nav-icon" />
            Settings
          </router-link>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Home, NotebookPen, Calendar, Settings } from 'lucide-vue-next'
import { db } from '@/utils/db'
import { useSettingsStore } from '@/stores/settings'
import { getFiscalYearFromWeek, formatFiscalYear } from '@/utils/fiscalYear'

const route = useRoute()
const settingsStore = useSettingsStore()
const availableYears = ref<number[]>([])

const isReviewActive = computed(() => {
  return route.path.startsWith('/review')
})

const fiscalYearStartMonth = computed(() => settingsStore.fiscalYearSettings.startMonth)
const isFiscalYearMode = computed(() => fiscalYearStartMonth.value !== 0)

// Format year for display (FY 2025 or 2025)
const formatYearForDisplay = (year: number): string => {
  if (isFiscalYearMode.value) {
    return formatFiscalYear(year)
  }
  return year.toString()
}

const loadAvailableYears = async () => {
  const calendarYears = await db.getYearsWithData()

  if (!isFiscalYearMode.value) {
    // Calendar year mode: just return the years as-is
    availableYears.value = calendarYears
  } else {
    // Fiscal year mode: convert calendar years to fiscal years
    const fiscalYearsSet = new Set<number>()

    for (const calendarYear of calendarYears) {
      // Get all weeks with data for this calendar year
      const weeks = await db.getWeeksByYear(calendarYear)

      // For each week, determine which fiscal year it belongs to
      for (const weekData of weeks) {
        const fiscalYear = getFiscalYearFromWeek(
          calendarYear,
          weekData.week,
          fiscalYearStartMonth.value,
        )
        fiscalYearsSet.add(fiscalYear)
      }
    }

    // Convert to sorted array
    availableYears.value = Array.from(fiscalYearsSet).sort((a, b) => b - a)
  }
}

// Reload years when navigating to review page (to catch deletions)
watch(
  () => route.path,
  (newPath) => {
    if (newPath.startsWith('/review')) {
      loadAvailableYears()
    }
  },
)

// Reload years when fiscal year settings change
watch(
  () => settingsStore.fiscalYearSettings.startMonth,
  () => {
    loadAvailableYears()
  },
)

onMounted(() => {
  loadAvailableYears()
})
</script>

<style scoped>
.sidebar {
  width: 280px;
  height: 100vh;
  background: linear-gradient(180deg, #1f2937 0%, #111827 100%);
  border-right: 1px solid #374151;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
}

.sidebar-header {
  padding: 2rem 1.5rem 1.5rem;
  border-bottom: 1px solid #374151;
}

.app-title {
  color: #f9fafb;
  font-size: 1.875rem;
  font-weight: 700;
  margin: 0 0 0.25rem 0;
  letter-spacing: -0.025em;
}

.app-subtitle {
  color: #9ca3af;
  font-size: 0.875rem;
  margin: 0;
  font-weight: 500;
}

.sidebar-nav {
  flex: 1;
  padding: 1.5rem 0;
}

.nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-item {
  margin: 0;
}

.nav-link {
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  color: #d1d5db;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.nav-link:hover {
  background: rgba(59, 130, 246, 0.1);
  color: #60a5fa;
  border-left-color: #60a5fa;
}

.nav-link.router-link-active {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border-left-color: #3b82f6;
}

.nav-icon {
  width: 1.25rem;
  height: 1.25rem;
  margin-right: 0.75rem;
  flex-shrink: 0;
}

.subnav-list {
  list-style: none;
  margin: 0;
  padding: 0;
  background: rgba(0, 0, 0, 0.2);
}

.subnav-item {
  margin: 0;
}

.subnav-link {
  display: block;
  padding: 0.5rem 1.5rem 0.5rem 3.5rem;
  color: #9ca3af;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.8125rem;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.subnav-link:hover {
  background: rgba(59, 130, 246, 0.1);
  color: #60a5fa;
  border-left-color: #60a5fa;
}

.subnav-link.router-link-active {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border-left-color: #3b82f6;
}
</style>
