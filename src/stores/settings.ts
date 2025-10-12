import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface ColorSettings {
  colors: string[]
  preset: string // 'default', 'pastel', 'vibrant', or 'forest'
}

export interface FiscalYearSettings {
  startMonth: number // Month when fiscal year begins (0 = January, 6 = July, etc.)
}

export interface ColorPreset {
  id: string
  name: string
  colors: string[]
}

const DEFAULT_COLORS = [
  '#EF9A9A', // Red 200 - Challenging (light red, luminance ~0.62)
  '#FFAB91', // Deep Orange 200 - Not great (light orange, luminance ~0.68)
  '#FFE082', // Amber 200 - Okay (soft yellow, luminance ~0.82)
  '#C5E1A5', // Light Green 200 - Good (light green, luminance ~0.79)
  '#A5D6A7', // Green 200 - Excellent (light green, luminance ~0.71)
]

export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'default',
    name: 'Default',
    colors: DEFAULT_COLORS,
  },
  {
    id: 'pastel',
    name: 'Pastel',
    colors: [
      '#FFCDD2', // Pale red for challenging (lightest/softest)
      '#FFCCBC', // Pale orange for not great
      '#FFF9C4', // Pale yellow for okay
      '#DCEDC8', // Pale lime for good
      '#C8E6C9', // Pale green for excellent (most saturated)
    ],
  },
  {
    id: 'vibrant',
    name: 'Vibrant',
    colors: [
      '#FFAB91', // Light coral for challenging (safe for colorblind)
      '#FFE082', // Light yellow for not great (high contrast)
      '#A5D6A7', // Light green for okay (deuteranopia safe)
      '#81D4FA', // Light blue for good (protanopia safe)
      '#CE93D8', // Light purple for excellent (distinct from all)
    ],
  },
  {
    id: 'forest',
    name: 'Forest',
    colors: [
      '#BCAAA4', // Light brown for challenging
      '#FFCC80', // Light orange for not great
      '#FFE082', // Light yellow for okay
      '#C5E1A5', // Light green for good
      '#80CBC4', // Light teal for excellent
    ],
  },
]

export const useSettingsStore = defineStore('settings', () => {
  const colorSettings = ref<ColorSettings>({
    colors: [...DEFAULT_COLORS],
    preset: 'default',
  })

  const fiscalYearSettings = ref<FiscalYearSettings>({
    startMonth: 0, // Default to January (calendar year)
  })

  // Load settings from localStorage on initialization
  const loadSettings = () => {
    const saved = localStorage.getItem('heartbeat-settings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.colorSettings) {
          colorSettings.value = parsed.colorSettings
        }
        if (parsed.fiscalYearSettings) {
          fiscalYearSettings.value = parsed.fiscalYearSettings
        }
      } catch (e) {
        console.error('Failed to load settings:', e)
      }
    }
  }

  // Save settings to localStorage
  const saveSettings = () => {
    try {
      localStorage.setItem(
        'heartbeat-settings',
        JSON.stringify({
          colorSettings: colorSettings.value,
          fiscalYearSettings: fiscalYearSettings.value,
        }),
      )
    } catch (e) {
      console.error('Failed to save settings:', e)
    }
  }

  // Reset colors to default
  const resetColors = () => {
    colorSettings.value.colors = [...DEFAULT_COLORS]
    colorSettings.value.preset = 'default'
    saveSettings()
  }

  // Set color preset
  const setPreset = (presetId: string) => {
    const preset = COLOR_PRESETS.find((p) => p.id === presetId)
    if (preset) {
      colorSettings.value.preset = presetId
      colorSettings.value.colors = [...preset.colors]
      saveSettings()
    }
  }

  // Get color for sentiment level (1-5)
  const getColorForLevel = (level: number | undefined): string => {
    if (level === undefined) {
      return '#e5e7eb' // Default gray
    }
    return colorSettings.value.colors[level - 1] || '#e5e7eb'
  }

  // Update fiscal year start month
  const setFiscalYearStartMonth = (startMonth: number) => {
    fiscalYearSettings.value.startMonth = startMonth
    saveSettings()
  }

  // Initialize settings
  loadSettings()

  return {
    colorSettings,
    fiscalYearSettings,
    resetColors,
    setPreset,
    getColorForLevel,
    setFiscalYearStartMonth,
    loadSettings,
    DEFAULT_COLORS,
    COLOR_PRESETS,
  }
})
