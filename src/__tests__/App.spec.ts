import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import App from '../App.vue'
import HomeView from '../views/HomeView.vue'

// Create a test router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
  ],
})

describe('App', () => {
  it('mounts and renders app layout', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router, createPinia()],
        stubs: {
          // Stub the chart component to avoid canvas issues in tests
          SentimentLineChart: {
            template: '<div class="chart-stub">Chart</div>',
          },
        },
      },
    })

    // Check that the main app structure is rendered
    expect(wrapper.text()).toContain('Heartbeat')
    expect(wrapper.find('.app-layout').exists()).toBe(true)
  })
})
