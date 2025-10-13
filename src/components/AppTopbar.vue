<template>
  <header class="topbar">
    <div class="topbar-container">
      <div class="topbar-left">
        <HeartPulse class="brand-icon" />
        <h1 class="app-title">
          <span class="app-title-full">Heartbeat Notes</span>
          <span class="app-title-short">Heartbeat</span>
        </h1>
      </div>

      <nav class="topbar-nav">
        <ul class="nav-list">
          <li class="nav-item">
            <router-link to="/home" class="nav-link">
              <Home class="nav-icon" />
              <span class="nav-text">Home</span>
            </router-link>
          </li>
          <li class="nav-item">
            <router-link to="/notes" class="nav-link">
              <NotebookPen class="nav-icon" />
              <span class="nav-text">Notes</span>
            </router-link>
          </li>
          <li
            class="nav-item review-item"
            @mouseenter="handleMouseEnter"
            @mouseleave="handleMouseLeave"
          >
            <router-link
              to="/review"
              class="nav-link"
              :class="{ 'has-subnav': availableYears.length > 0 }"
            >
              <Calendar class="nav-icon" />
              <span class="nav-text">Review</span>
              <ChevronDown
                v-if="availableYears.length > 0"
                class="chevron-icon"
                :class="{ rotated: showDropdown }"
              />
            </router-link>
            <ul
              v-if="availableYears.length > 0 && showDropdown"
              class="subnav-dropdown"
              @mouseenter="handleMouseEnter"
              @mouseleave="handleMouseLeave"
            >
              <li v-for="year in availableYears" :key="year" class="subnav-item">
                <router-link
                  :to="`/review/${year}`"
                  class="subnav-link"
                  @click="showDropdown = false"
                >
                  {{ formatYearForDisplay(year) }}
                </router-link>
              </li>
            </ul>
          </li>
          <li class="nav-item">
            <router-link to="/settings" class="nav-link">
              <Settings class="nav-icon" />
              <span class="nav-text">Settings</span>
            </router-link>
          </li>
        </ul>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Home, NotebookPen, Calendar, Settings, ChevronDown, HeartPulse } from 'lucide-vue-next'
import { db } from '@/utils/db'
import { useSettingsStore } from '@/stores/settings'
import { getFiscalYearFromWeek, formatFiscalYear } from '@/utils/fiscalYear'

const route = useRoute()
const settingsStore = useSettingsStore()
const availableYears = ref<number[]>([])
const showDropdown = ref(false)
let hideTimeout: number | null = null

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

const handleMouseEnter = () => {
  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }
  showDropdown.value = true
}

const handleMouseLeave = () => {
  hideTimeout = window.setTimeout(() => {
    showDropdown.value = false
  }, 200)
}

onMounted(() => {
  loadAvailableYears()
})
</script>

<style scoped>
.topbar {
  width: 100%;
  background: var(--color-theme-primary-darkest);
  border-bottom: 1px solid var(--color-theme-primary-darkest);
  position: fixed;
  top: 0;
  left: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.topbar-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  height: 64px;
  max-width: 1400px;
  margin: 0 auto;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-icon {
  width: 1.75rem;
  height: 1.75rem;
  color: var(--color-white);
}

.app-title {
  color: var(--color-white);
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.025em;
}

.app-title-short {
  display: none;
}

.app-subtitle {
  color: var(--color-theme-primary-light);
  font-size: 0.875rem;
  font-weight: 500;
}

.topbar-nav {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

.nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-item {
  margin: 0;
  position: relative;
}

.review-item {
  position: relative;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  color: var(--color-theme-primary-light);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  border-radius: 6px;
  border-bottom: 2px solid transparent;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.15);
  color: var(--color-white);
}

.nav-link.router-link-active {
  background: rgba(255, 255, 255, 0.2);
  color: var(--color-white);
  border-bottom-color: var(--color-white);
}

.nav-icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
}

.chevron-icon {
  width: 0.875rem;
  height: 0.875rem;
  transition: transform 0.2s ease;
}

.chevron-icon.rotated {
  transform: rotate(180deg);
}

.subnav-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 0.5rem;
  background: var(--color-white);
  border: 1px solid var(--color-theme-primary-light);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  list-style: none;
  padding: 0.5rem 0;
  min-width: 140px;
  z-index: 1000;
}

.subnav-item {
  margin: 0;
}

.subnav-link {
  display: block;
  padding: 0.5rem 1rem;
  color: var(--color-theme-primary-darkest);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.subnav-link:hover {
  background: var(--color-theme-primary-light);
  color: var(--color-theme-primary-darker);
}

.subnav-link.router-link-active {
  background: var(--color-theme-primary);
  color: var(--color-white);
}

/* Responsive design */
@media (max-width: 768px) {
  .topbar-container {
    padding: 0 1rem;
  }

  .topbar-left {
    gap: 0.5rem;
  }

  .app-title {
    font-size: 1.25rem;
  }

  .app-subtitle {
    display: none;
  }

  .nav-text {
    display: none;
  }

  .nav-link {
    padding: 0.5rem;
  }

  .nav-list {
    gap: 0.25rem;
  }
}

@media (max-width: 480px) {
  .app-title-full {
    display: none;
  }

  .app-title-short {
    display: inline;
  }

  .app-title {
    font-size: 1.125rem;
  }
}
</style>
