<script setup lang="ts">
import { onMounted } from 'vue'
import AppTopbar from './components/AppTopbar.vue'
import { useSyncStore } from './stores/sync'
import { performFullSync } from './utils/syncManager'

const syncStore = useSyncStore()

onMounted(async () => {
  // Initialize sync store
  await syncStore.init()

  // If sync is enabled, perform initial sync to load data from file
  if (syncStore.canSync) {
    try {
      await performFullSync()
    } catch (e) {
      console.error('Initial sync failed:', e)
      // Don't block app initialization on sync failure
    }
  }
})
</script>

<template>
  <div class="app-layout">
    <AppTopbar />
    <main class="main-content">
      <div class="content-container">
        <router-view />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--color-theme-primary-lightest);
}

.main-content {
  flex: 1;
  margin-top: 64px;
  overflow-y: auto;
}

.content-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* Responsive design */
@media (max-width: 768px) {
  .content-container {
    padding: 1rem;
  }
}
</style>
