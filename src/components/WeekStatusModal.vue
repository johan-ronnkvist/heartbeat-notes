<template>
  <div v-if="isOpen" class="modal-overlay" @click="close">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3 class="modal-title">Week Status</h3>
        <button class="close-button" @click="close" title="Close">
          <X class="close-icon" />
        </button>
      </div>

      <div class="modal-body">
        <p class="modal-description">Select a status for this week</p>

        <div class="status-buttons">
          <button
            class="status-button"
            :class="{ active: localWeekStatus === null }"
            :disabled="!isEditable"
            @click="selectStatus(null)"
          >
            <div class="status-icon">📅</div>
            <div class="status-label">Normal</div>
          </button>

          <button
            class="status-button"
            :class="{ active: localWeekStatus === 'vacation' }"
            :disabled="!isEditable"
            @click="selectStatus('vacation')"
          >
            <div class="status-icon">🏖️</div>
            <div class="status-label">Vacation</div>
          </button>

          <button
            class="status-button"
            :class="{ active: localWeekStatus === 'sick' }"
            :disabled="!isEditable"
            @click="selectStatus('sick')"
          >
            <div class="status-icon">🤒</div>
            <div class="status-label">Sick Leave</div>
          </button>
        </div>

        <div v-if="!isEditable" class="info-message">
          <p>This week is locked. Unlock it to make changes.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import type { WeekStatus } from '@/utils/db'

interface Props {
  isOpen: boolean
  weekStatus: WeekStatus | null
  isEditable: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  save: [status: WeekStatus | null]
}>()

const localWeekStatus = ref<WeekStatus | null>(props.weekStatus)

// Watch for prop changes to update local state when modal opens
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      localWeekStatus.value = props.weekStatus
    }
  },
)

const close = () => {
  emit('close')
}

const selectStatus = (status: WeekStatus | null) => {
  if (!props.isEditable) return
  localWeekStatus.value = status
  emit('save', status)
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: #6b7280;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-button:hover {
  background: #f3f4f6;
  color: #111827;
}

.close-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.modal-body {
  padding: 2rem;
  overflow-y: auto;
  flex: 1;
}

.modal-description {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0 0 1.5rem 0;
  text-align: center;
}

.status-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.status-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.status-button:hover:not(:disabled) {
  border-color: var(--color-theme-primary);
  background: var(--color-theme-primary-lightest);
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.status-button.active {
  border-color: var(--color-theme-primary);
  background: var(--color-theme-primary-lighter);
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

.status-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.status-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.status-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  text-align: center;
}

.info-message {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 0.5rem;
  color: #92400e;
  font-size: 0.875rem;
}

.info-message p {
  margin: 0;
}

@media (max-width: 640px) {
  .modal-content {
    max-width: 100%;
    border-radius: 0.5rem;
  }

  .modal-header,
  .modal-body {
    padding: 1rem;
  }

  .status-buttons {
    grid-template-columns: 1fr;
  }

  .status-button {
    padding: 1.25rem 1rem;
  }
}
</style>
