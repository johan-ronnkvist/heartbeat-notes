import { ref, onMounted } from 'vue'

export function usePWA() {
  const isInstalled = ref(false)
  const isStandalone = ref(false)

  onMounted(() => {
    // Check if running in standalone mode (installed PWA)
    isStandalone.value = window.matchMedia('(display-mode: standalone)').matches

    // For iOS Safari
    const isIOSStandalone = (window.navigator as { standalone?: boolean }).standalone === true

    isInstalled.value = isStandalone.value || isIOSStandalone
  })

  return {
    isInstalled,
    isStandalone,
  }
}
