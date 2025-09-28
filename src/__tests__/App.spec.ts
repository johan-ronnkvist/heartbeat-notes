import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import App from '../App.vue'
import DashboardView from '../views/DashboardView.vue'

// Create a test router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
    },
  ],
})

describe('App', () => {
  it('mounts and renders app layout', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    })

    // Check that the main app structure is rendered
    expect(wrapper.text()).toContain('Mimir')
    expect(wrapper.text()).toContain('Career Progress Companion')
    expect(wrapper.find('.app-layout').exists()).toBe(true)
  })
})
