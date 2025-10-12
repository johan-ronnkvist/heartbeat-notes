import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { canUseSync } from '@/utils/pwa'

const HANDLE_STORE_NAME = 'heartbeat-sync-handles'
const HANDLE_KEY = 'directory-handle'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'not-configured'

export interface SyncState {
  enabled: boolean
  lastSyncTime: Date | null
  status: SyncStatus
  error: string | null
}

/**
 * Store directory handle in IndexedDB (separate from main data)
 */
async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openHandleDB()
  const transaction = db.transaction(HANDLE_STORE_NAME, 'readwrite')
  const store = transaction.objectStore(HANDLE_STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.put({ key: HANDLE_KEY, handle })
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Load directory handle from IndexedDB
 */
async function loadDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openHandleDB()
    const transaction = db.transaction(HANDLE_STORE_NAME, 'readonly')
    const store = transaction.objectStore(HANDLE_STORE_NAME)

    return new Promise((resolve, reject) => {
      const request = store.get(HANDLE_KEY)
      request.onsuccess = () => {
        const result = request.result
        resolve(result ? result.handle : null)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (e) {
    console.error('Failed to load directory handle:', e)
    return null
  }
}

/**
 * Delete directory handle from IndexedDB
 */
async function deleteDirectoryHandle(): Promise<void> {
  const db = await openHandleDB()
  const transaction = db.transaction(HANDLE_STORE_NAME, 'readwrite')
  const store = transaction.objectStore(HANDLE_STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.delete(HANDLE_KEY)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Open IndexedDB for storing file system handles
 */
function openHandleDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('heartbeat-sync-db', 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(HANDLE_STORE_NAME)) {
        db.createObjectStore(HANDLE_STORE_NAME, { keyPath: 'key' })
      }
    }
  })
}

export const useSyncStore = defineStore('sync', () => {
  const directoryHandle = ref<FileSystemDirectoryHandle | null>(null)
  const enabled = ref(false)
  const lastSyncTime = ref<Date | null>(null)
  const status = ref<SyncStatus>('not-configured')
  const error = ref<string | null>(null)
  const isPwaInstalled = ref(false)

  const isSyncAvailable = computed(() => isPwaInstalled.value && canUseSync())
  const isConfigured = computed(() => directoryHandle.value !== null)
  const canSync = computed(() => isSyncAvailable.value && isConfigured.value && enabled.value)

  /**
   * Request user to select a directory for sync
   */
  async function requestDirectory(): Promise<boolean> {
    if (!canUseSync()) {
      error.value = 'File System Access API is not available'
      return false
    }

    try {
      // Request directory picker
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents',
      })

      // Verify we have permission
      const permission = await handle.queryPermission({ mode: 'readwrite' })
      if (permission !== 'granted') {
        const requestResult = await handle.requestPermission({ mode: 'readwrite' })
        if (requestResult !== 'granted') {
          error.value = 'Permission denied to access directory'
          status.value = 'error'
          return false
        }
      }

      // Save handle
      directoryHandle.value = handle
      await saveDirectoryHandle(handle)

      error.value = null
      status.value = 'idle'

      return true
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        // User cancelled - not an error
        return false
      }
      error.value = e instanceof Error ? e.message : 'Failed to select directory'
      status.value = 'error'
      return false
    }
  }

  /**
   * Enable automatic sync
   */
  async function enableSync(): Promise<boolean> {
    if (!isConfigured.value) {
      const success = await requestDirectory()
      if (!success) return false
    }

    enabled.value = true
    status.value = 'idle'
    saveState()

    return true
  }

  /**
   * Disable automatic sync
   */
  function disableSync() {
    enabled.value = false
    status.value = 'not-configured'
    saveState()
  }

  /**
   * Disconnect (remove directory handle)
   */
  async function disconnect() {
    directoryHandle.value = null
    enabled.value = false
    lastSyncTime.value = null
    status.value = 'not-configured'
    error.value = null

    await deleteDirectoryHandle()
    saveState()
  }

  /**
   * Verify directory handle is still valid
   */
  async function verifyPermission(): Promise<boolean> {
    if (!directoryHandle.value) return false

    try {
      const permission = await directoryHandle.value.queryPermission({ mode: 'readwrite' })

      if (permission === 'granted') {
        return true
      }

      // Try to request permission again
      const requestResult = await directoryHandle.value.requestPermission({ mode: 'readwrite' })
      if (requestResult !== 'granted') {
        error.value = 'Lost access to sync folder. Please reconnect.'
        status.value = 'error'
        return false
      }
      return true
    } catch (e) {
      console.error('Permission verification failed:', e)
      error.value = 'Lost access to sync folder. Please reconnect.'
      status.value = 'error'
      return false
    }
  }

  /**
   * Get file handle for heartbeat-data.json
   */
  async function getFileHandle(): Promise<FileSystemFileHandle | null> {
    if (!directoryHandle.value) return null

    try {
      const hasPermission = await verifyPermission()
      if (!hasPermission) return null

      const fileHandle = await directoryHandle.value.getFileHandle('heartbeat-data.json', {
        create: true,
      })

      return fileHandle
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to access sync file'
      status.value = 'error'
      return null
    }
  }

  /**
   * Update sync status
   */
  function setStatus(newStatus: SyncStatus, errorMessage: string | null = null) {
    status.value = newStatus
    error.value = errorMessage

    if (newStatus === 'synced') {
      lastSyncTime.value = new Date()
    }

    saveState()
  }

  /**
   * Load sync state from localStorage
   */
  function loadState() {
    const saved = localStorage.getItem('heartbeat-sync-state')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        enabled.value = parsed.enabled || false
        lastSyncTime.value = parsed.lastSyncTime ? new Date(parsed.lastSyncTime) : null
        status.value = parsed.status || 'not-configured'
      } catch (e) {
        console.error('Failed to load sync state:', e)
      }
    }
  }

  /**
   * Save sync state to localStorage
   */
  function saveState() {
    try {
      localStorage.setItem(
        'heartbeat-sync-state',
        JSON.stringify({
          enabled: enabled.value,
          lastSyncTime: lastSyncTime.value?.toISOString(),
          status: status.value,
        }),
      )
    } catch (e) {
      console.error('Failed to save sync state:', e)
    }
  }

  /**
   * Update PWA installation status
   */
  function updatePwaStatus() {
    isPwaInstalled.value = canUseSync()
  }

  /**
   * Initialize sync store
   */
  async function init() {
    loadState()

    // Check initial PWA status
    updatePwaStatus()

    // Listen for display mode changes (PWA installation/uninstallation)
    if (window.matchMedia) {
      const standaloneQuery = window.matchMedia('(display-mode: standalone)')
      const minimalUiQuery = window.matchMedia('(display-mode: minimal-ui)')

      const handleDisplayModeChange = () => {
        updatePwaStatus()
      }

      standaloneQuery.addEventListener('change', handleDisplayModeChange)
      minimalUiQuery.addEventListener('change', handleDisplayModeChange)
    }

    // Re-check PWA status when page becomes visible (helps detect PWA installation)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        updatePwaStatus()
      }
    })

    // Try to restore directory handle from IndexedDB
    const handle = await loadDirectoryHandle()
    if (handle) {
      directoryHandle.value = handle

      // Verify permission is still valid
      const hasPermission = await verifyPermission()
      if (!hasPermission) {
        // Lost permission - reset
        await disconnect()
      }
    }
  }

  return {
    directoryHandle,
    enabled,
    lastSyncTime,
    status,
    error,
    isPwaInstalled,
    isSyncAvailable,
    isConfigured,
    canSync,
    requestDirectory,
    enableSync,
    disableSync,
    disconnect,
    verifyPermission,
    getFileHandle,
    setStatus,
    updatePwaStatus,
    init,
  }
})
