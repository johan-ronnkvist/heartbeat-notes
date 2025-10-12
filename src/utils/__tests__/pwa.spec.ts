import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  isPWA,
  getDisplayMode,
  supportsFileSystemAccess,
  canUseSync,
  getBrowserName,
  isChromiumBased,
} from '../pwa'

describe('pwa utilities', () => {
  beforeEach(() => {
    // Reset window.navigator.standalone
    vi.stubGlobal('navigator', {
      ...window.navigator,
      standalone: undefined,
      userAgent: window.navigator.userAgent,
    })
  })

  describe('isPWA', () => {
    it('should return true when navigator.standalone is true (iOS)', () => {
      vi.stubGlobal('navigator', {
        ...window.navigator,
        standalone: true,
      })

      expect(isPWA()).toBe(true)
    })

    it('should return true when display-mode is standalone', () => {
      // Mock matchMedia to return standalone
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      expect(isPWA()).toBe(true)
    })

    it('should return true when display-mode is minimal-ui', () => {
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query === '(display-mode: minimal-ui)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      expect(isPWA()).toBe(true)
    })

    it('should return false when running in browser mode', () => {
      vi.stubGlobal('navigator', {
        ...window.navigator,
        standalone: false,
      })

      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      expect(isPWA()).toBe(false)
    })
  })

  describe('getDisplayMode', () => {
    it('should return "fullscreen" when in fullscreen mode', () => {
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query === '(display-mode: fullscreen)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      expect(getDisplayMode()).toBe('fullscreen')
    })

    it('should return "standalone" when in standalone mode', () => {
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      expect(getDisplayMode()).toBe('standalone')
    })

    it('should return "minimal-ui" when in minimal-ui mode', () => {
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query === '(display-mode: minimal-ui)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      expect(getDisplayMode()).toBe('minimal-ui')
    })

    it('should return "browser" when in normal browser mode', () => {
      vi.stubGlobal('matchMedia', () => ({
        matches: false,
        media: '',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      expect(getDisplayMode()).toBe('browser')
    })
  })

  describe('supportsFileSystemAccess', () => {
    it('should return true when File System Access API is available', () => {
      vi.stubGlobal('showDirectoryPicker', vi.fn())

      expect(supportsFileSystemAccess()).toBe(true)
    })

    it('should return false when File System Access API is not available', () => {
      vi.stubGlobal('showDirectoryPicker', undefined)

      expect(supportsFileSystemAccess()).toBe(false)
    })
  })

  describe('canUseSync', () => {
    it('should return true when both PWA and File System Access are available', () => {
      vi.stubGlobal('navigator', {
        ...window.navigator,
        standalone: true,
      })
      vi.stubGlobal('showDirectoryPicker', vi.fn())

      expect(canUseSync()).toBe(true)
    })

    it('should return false when not PWA', () => {
      vi.stubGlobal('navigator', {
        ...window.navigator,
        standalone: false,
      })
      vi.stubGlobal('matchMedia', () => ({
        matches: false,
        media: '',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
      vi.stubGlobal('showDirectoryPicker', vi.fn())

      expect(canUseSync()).toBe(false)
    })

    it('should return false when File System Access is not available', () => {
      vi.stubGlobal('navigator', {
        ...window.navigator,
        standalone: true,
      })
      vi.stubGlobal('showDirectoryPicker', undefined)

      expect(canUseSync()).toBe(false)
    })
  })

  describe('getBrowserName', () => {
    it('should detect Edge browser', () => {
      vi.stubGlobal('navigator', {
        ...window.navigator,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      })

      expect(getBrowserName()).toBe('Edge')
    })

    it('should detect Chrome browser', () => {
      vi.stubGlobal('navigator', {
        ...window.navigator,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      })

      expect(getBrowserName()).toBe('Chrome')
    })

    it('should detect Safari browser', () => {
      vi.stubGlobal('navigator', {
        ...window.navigator,
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      })

      expect(getBrowserName()).toBe('Safari')
    })

    it('should detect Firefox browser', () => {
      vi.stubGlobal('navigator', {
        ...window.navigator,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/120.0',
      })

      expect(getBrowserName()).toBe('Firefox')
    })

    it('should return Unknown for unrecognized browsers', () => {
      vi.stubGlobal('navigator', {
        ...window.navigator,
        userAgent: 'SomeUnknownBrowser/1.0',
      })

      expect(getBrowserName()).toBe('Unknown')
    })
  })

  describe('isChromiumBased', () => {
    it('should return true for Chrome', () => {
      vi.stubGlobal('navigator', {
        ...window.navigator,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      })

      expect(isChromiumBased()).toBe(true)
    })

    it('should return true for Edge', () => {
      vi.stubGlobal('navigator', {
        ...window.navigator,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      })

      expect(isChromiumBased()).toBe(true)
    })

    it('should return false for Safari', () => {
      vi.stubGlobal('navigator', {
        ...window.navigator,
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      })

      expect(isChromiumBased()).toBe(false)
    })

    it('should return false for Firefox', () => {
      vi.stubGlobal('navigator', {
        ...window.navigator,
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/120.0',
      })

      expect(isChromiumBased()).toBe(false)
    })
  })
})
