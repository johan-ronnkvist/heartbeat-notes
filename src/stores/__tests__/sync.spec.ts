import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSyncStore } from '../sync'

// Mock the PWA utilities
vi.mock('@/utils/pwa', () => ({
  canUseSync: vi.fn(() => true),
}))

// Mock IndexedDB operations (these are internal to sync.ts but we can't easily mock them)
// Instead we'll rely on the fact that IndexedDB failures are caught and handled
let mockIndexedDBSuccess = true

vi.stubGlobal('indexedDB', {
  open: vi.fn().mockImplementation(() => {
    const request = {
      onsuccess: null as ((event: unknown) => void) | null,
      onerror: null as ((event: unknown) => void) | null,
      onupgradeneeded: null as ((event: unknown) => void) | null,
      result: {
        transaction: vi.fn().mockReturnValue({
          objectStore: vi.fn().mockReturnValue({
            put: vi.fn().mockImplementation(() => {
              const putRequest = {
                onsuccess: null as (() => void) | null,
                onerror: null as (() => void) | null,
              }
              setTimeout(() => {
                if (mockIndexedDBSuccess && putRequest.onsuccess) {
                  putRequest.onsuccess()
                } else if (!mockIndexedDBSuccess && putRequest.onerror) {
                  putRequest.onerror()
                }
              }, 0)
              return putRequest
            }),
            get: vi.fn().mockImplementation(() => {
              const getRequest = {
                onsuccess: null as (() => void) | null,
                onerror: null as (() => void) | null,
                result: null,
              }
              setTimeout(() => {
                if (mockIndexedDBSuccess && getRequest.onsuccess) {
                  getRequest.onsuccess()
                } else if (!mockIndexedDBSuccess && getRequest.onerror) {
                  getRequest.onerror()
                }
              }, 0)
              return getRequest
            }),
            delete: vi.fn().mockImplementation(() => {
              const deleteRequest = {
                onsuccess: null as (() => void) | null,
                onerror: null as (() => void) | null,
              }
              setTimeout(() => {
                if (mockIndexedDBSuccess && deleteRequest.onsuccess) {
                  deleteRequest.onsuccess()
                } else if (!mockIndexedDBSuccess && deleteRequest.onerror) {
                  deleteRequest.onerror()
                }
              }, 0)
              return deleteRequest
            }),
            createIndex: vi.fn(),
          }),
        }),
      },
    }
    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: request })
      }
    }, 0)
    return request
  }),
})

describe('useSyncStore', () => {
  let mockDirectoryHandle: FileSystemDirectoryHandle

  beforeEach(() => {
    setActivePinia(createPinia())
    mockIndexedDBSuccess = true

    // Mock FileSystemDirectoryHandle
    mockDirectoryHandle = {
      kind: 'directory',
      name: 'test-folder',
      queryPermission: vi.fn().mockResolvedValue('granted'),
      requestPermission: vi.fn().mockResolvedValue('granted'),
      getFileHandle: vi.fn().mockResolvedValue({
        kind: 'file',
        name: 'heartbeat-data.json',
        getFile: vi.fn().mockResolvedValue(new File(['{}'], 'heartbeat-data.json')),
        createWritable: vi.fn().mockResolvedValue({
          write: vi.fn().mockResolvedValue(undefined),
          close: vi.fn().mockResolvedValue(undefined),
        }),
      } as unknown as FileSystemFileHandle),
      isSameEntry: vi.fn(),
    } as unknown as FileSystemDirectoryHandle

    // Mock showDirectoryPicker
    vi.stubGlobal('showDirectoryPicker', vi.fn().mockResolvedValue(mockDirectoryHandle))

    // Clear localStorage
    localStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const store = useSyncStore()

      expect(store.directoryHandle).toBeNull()
      expect(store.enabled).toBe(false)
      expect(store.lastSyncTime).toBeNull()
      expect(store.status).toBe('not-configured')
      expect(store.error).toBeNull()
    })

    it('should compute isSyncAvailable correctly', async () => {
      const store = useSyncStore()
      await store.init()
      expect(store.isSyncAvailable).toBe(true)
    })

    it('should compute isConfigured correctly', () => {
      const store = useSyncStore()
      expect(store.isConfigured).toBe(false)

      store.directoryHandle = mockDirectoryHandle
      expect(store.isConfigured).toBe(true)
    })

    it('should compute canSync correctly', async () => {
      const store = useSyncStore()
      await store.init()
      expect(store.canSync).toBe(false)

      store.directoryHandle = mockDirectoryHandle
      store.enabled = true
      expect(store.canSync).toBe(true)
    })
  })

  describe('requestDirectory', () => {
    it('should request directory picker and save handle', async () => {
      const store = useSyncStore()
      const result = await store.requestDirectory()

      expect(result).toBe(true)
      expect(store.directoryHandle).toStrictEqual(mockDirectoryHandle)
      expect(store.error).toBeNull()
      expect(store.status).toBe('idle')
    })

    it('should handle user cancellation', async () => {
      const store = useSyncStore()

      // Mock user cancellation
      vi.stubGlobal(
        'showDirectoryPicker',
        vi.fn().mockRejectedValue(new DOMException('User cancelled', 'AbortError')),
      )

      const result = await store.requestDirectory()

      expect(result).toBe(false)
      expect(store.directoryHandle).toBeNull()
    })

    it('should handle permission denied', async () => {
      const store = useSyncStore()

      // Mock permission denied
      const deniedHandle = {
        ...mockDirectoryHandle,
        queryPermission: vi.fn().mockResolvedValue('denied'),
        requestPermission: vi.fn().mockResolvedValue('denied'),
      } as unknown as FileSystemDirectoryHandle

      vi.stubGlobal('showDirectoryPicker', vi.fn().mockResolvedValue(deniedHandle))

      const result = await store.requestDirectory()

      expect(result).toBe(false)
      expect(store.error).toContain('Permission denied')
      expect(store.status).toBe('error')
    })

    it('should handle errors', async () => {
      const store = useSyncStore()

      vi.stubGlobal('showDirectoryPicker', vi.fn().mockRejectedValue(new Error('Test error')))

      const result = await store.requestDirectory()

      expect(result).toBe(false)
      expect(store.error).toBe('Test error')
      expect(store.status).toBe('error')
    })
  })

  describe('enableSync', () => {
    it('should enable sync if directory is already configured', async () => {
      const store = useSyncStore()
      store.directoryHandle = mockDirectoryHandle

      const result = await store.enableSync()

      expect(result).toBe(true)
      expect(store.enabled).toBe(true)
      expect(store.status).toBe('idle')
    })

    it('should request directory if not configured', async () => {
      const store = useSyncStore()

      const result = await store.enableSync()

      expect(result).toBe(true)
      expect(store.enabled).toBe(true)
      expect(store.directoryHandle).toStrictEqual(mockDirectoryHandle)
    })

    it('should fail if directory request fails', async () => {
      const store = useSyncStore()

      vi.stubGlobal(
        'showDirectoryPicker',
        vi.fn().mockRejectedValue(new DOMException('User cancelled', 'AbortError')),
      )

      const result = await store.enableSync()

      expect(result).toBe(false)
      expect(store.enabled).toBe(false)
    })
  })

  describe('disableSync', () => {
    it('should disable sync', () => {
      const store = useSyncStore()
      store.enabled = true
      store.status = 'synced'

      store.disableSync()

      expect(store.enabled).toBe(false)
      expect(store.status).toBe('not-configured')
    })
  })

  describe('disconnect', () => {
    it('should reset all sync state', async () => {
      const store = useSyncStore()
      store.directoryHandle = mockDirectoryHandle
      store.enabled = true
      store.lastSyncTime = new Date()
      store.status = 'synced'

      await store.disconnect()

      expect(store.directoryHandle).toBeNull()
      expect(store.enabled).toBe(false)
      expect(store.lastSyncTime).toBeNull()
      expect(store.status).toBe('not-configured')
      expect(store.error).toBeNull()
    })
  })

  describe('verifyPermission', () => {
    it('should return true if permission is granted', async () => {
      const store = useSyncStore()
      store.directoryHandle = mockDirectoryHandle

      const result = await store.verifyPermission()

      expect(result).toBe(true)
    })

    it('should request permission if not granted', async () => {
      const store = useSyncStore()

      const promptHandle = {
        ...mockDirectoryHandle,
        queryPermission: vi.fn().mockResolvedValue('prompt'),
        requestPermission: vi.fn().mockResolvedValue('granted'),
      } as unknown as FileSystemDirectoryHandle

      store.directoryHandle = promptHandle

      const result = await store.verifyPermission()

      expect(result).toBe(true)
      expect(promptHandle.requestPermission).toHaveBeenCalled()
    })

    it('should return false if permission is denied', async () => {
      const store = useSyncStore()

      const deniedHandle = {
        ...mockDirectoryHandle,
        queryPermission: vi.fn().mockResolvedValue('denied'),
        requestPermission: vi.fn().mockResolvedValue('denied'),
      } as unknown as FileSystemDirectoryHandle

      store.directoryHandle = deniedHandle

      const result = await store.verifyPermission()

      expect(result).toBe(false)
      expect(store.status).toBe('error')
      expect(store.error).toContain('Lost access')
    })

    it('should return false if no directory handle', async () => {
      const store = useSyncStore()

      const result = await store.verifyPermission()

      expect(result).toBe(false)
    })
  })

  describe('getFileHandle', () => {
    it('should return file handle for heartbeat-data.json', async () => {
      const store = useSyncStore()
      store.directoryHandle = mockDirectoryHandle

      const fileHandle = await store.getFileHandle()

      expect(fileHandle).toBeDefined()
      expect(fileHandle?.name).toBe('heartbeat-data.json')
    })

    it('should return null if no directory handle', async () => {
      const store = useSyncStore()

      const fileHandle = await store.getFileHandle()

      expect(fileHandle).toBeNull()
    })

    it('should return null if permission verification fails', async () => {
      const store = useSyncStore()

      const deniedHandle = {
        ...mockDirectoryHandle,
        queryPermission: vi.fn().mockResolvedValue('denied'),
        requestPermission: vi.fn().mockResolvedValue('denied'),
      } as unknown as FileSystemDirectoryHandle

      store.directoryHandle = deniedHandle

      const fileHandle = await store.getFileHandle()

      expect(fileHandle).toBeNull()
    })

    it('should handle errors', async () => {
      const store = useSyncStore()

      const errorHandle = {
        ...mockDirectoryHandle,
        getFileHandle: vi.fn().mockRejectedValue(new Error('File access error')),
      } as unknown as FileSystemDirectoryHandle

      store.directoryHandle = errorHandle

      const fileHandle = await store.getFileHandle()

      expect(fileHandle).toBeNull()
      expect(store.status).toBe('error')
      expect(store.error).toContain('File access error')
    })
  })

  describe('setStatus', () => {
    it('should update status and error', () => {
      const store = useSyncStore()

      store.setStatus('syncing')
      expect(store.status).toBe('syncing')
      expect(store.error).toBeNull()

      store.setStatus('error', 'Test error')
      expect(store.status).toBe('error')
      expect(store.error).toBe('Test error')
    })

    it('should update lastSyncTime when status is synced', () => {
      const store = useSyncStore()
      const beforeSync = new Date()

      store.setStatus('synced')

      expect(store.lastSyncTime).toBeDefined()
      expect(store.lastSyncTime!.getTime()).toBeGreaterThanOrEqual(beforeSync.getTime())
    })
  })

  describe('state persistence', () => {
    it('should save state to localStorage', () => {
      const store = useSyncStore()
      store.enabled = true
      store.status = 'synced'
      store.lastSyncTime = new Date('2024-01-01')

      // Trigger save by calling setStatus
      store.setStatus('synced')

      const saved = localStorage.getItem('heartbeat-sync-state')
      expect(saved).toBeDefined()

      const parsed = JSON.parse(saved!)
      expect(parsed.enabled).toBe(true)
      expect(parsed.status).toBe('synced')
      expect(parsed.lastSyncTime).toBeDefined()
    })

    it('should load state from localStorage on init', async () => {
      localStorage.setItem(
        'heartbeat-sync-state',
        JSON.stringify({
          enabled: true,
          status: 'synced',
          lastSyncTime: '2024-01-01T00:00:00.000Z',
        }),
      )

      // Create new store instance which will call init
      const store = useSyncStore()
      await store.init()

      expect(store.enabled).toBe(true)
      expect(store.status).toBe('synced')
      expect(store.lastSyncTime).toBeInstanceOf(Date)
    })
  })
})
