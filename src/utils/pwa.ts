/**
 * PWA detection and capability utilities
 */

/**
 * Check if the app is currently running as an installed PWA
 */
export function isPWA(): boolean {
  // Check if running in standalone mode (iOS)
  if (window.navigator.standalone === true) {
    return true
  }

  // Check display mode media query (standard)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true
  }

  // Check display mode for minimal-ui
  if (window.matchMedia('(display-mode: minimal-ui)').matches) {
    return true
  }

  return false
}

/**
 * Get current display mode
 */
export function getDisplayMode(): 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen' {
  if (window.matchMedia('(display-mode: fullscreen)').matches) {
    return 'fullscreen'
  }
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return 'standalone'
  }
  if (window.matchMedia('(display-mode: minimal-ui)').matches) {
    return 'minimal-ui'
  }
  return 'browser'
}

/**
 * Check if File System Access API is supported
 */
export function supportsFileSystemAccess(): boolean {
  return 'showDirectoryPicker' in window && typeof window.showDirectoryPicker === 'function'
}

/**
 * Check if the user can use sync features (PWA + File System Access API)
 */
export function canUseSync(): boolean {
  return isPWA() && supportsFileSystemAccess()
}

/**
 * Get browser name for feature compatibility messaging
 */
export function getBrowserName(): string {
  const userAgent = navigator.userAgent

  if (userAgent.includes('Edg/')) return 'Edge'
  if (userAgent.includes('Chrome/')) return 'Chrome'
  if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) return 'Safari'
  if (userAgent.includes('Firefox/')) return 'Firefox'

  return 'Unknown'
}

/**
 * Check if browser is Chromium-based (best File System Access API support)
 */
export function isChromiumBased(): boolean {
  const browser = getBrowserName()
  return browser === 'Chrome' || browser === 'Edge'
}
