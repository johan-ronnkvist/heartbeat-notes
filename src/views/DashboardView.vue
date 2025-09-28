<template>
  <div class="dashboard">
    <div class="dashboard-header mb-8">
      <h1>Welcome back!</h1>
      <p class="text-gray-600 mt-2">Here's an overview of your career progress</p>
    </div>

    <div class="dashboard-grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">This Week</h3>
          <p class="card-subtitle">Current week progress</p>
        </div>
        <div class="stat-value">
          <span class="text-3xl font-bold text-blue-600">3</span>
          <span class="text-sm text-gray-500 ml-2">achievements logged</span>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">This Month</h3>
          <p class="card-subtitle">Monthly summary</p>
        </div>
        <div class="stat-value">
          <span class="text-3xl font-bold text-green-600">12</span>
          <span class="text-sm text-gray-500 ml-2">total entries</span>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Streak</h3>
          <p class="card-subtitle">Consecutive weeks</p>
        </div>
        <div class="stat-value">
          <span class="text-3xl font-bold text-purple-600">4</span>
          <span class="text-sm text-gray-500 ml-2">weeks active</span>
        </div>
      </div>
    </div>

    <div class="dashboard-content grid-cols-1 md:grid-cols-2 gap-6">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Recent Achievements</h3>
          <p class="card-subtitle">Your latest accomplishments</p>
        </div>
        <div class="achievement-list">
          <div class="achievement-item">
            <div class="achievement-date text-xs text-gray-400">Sept 25, 2024</div>
            <div class="achievement-text">Completed Vue 3 migration project</div>
          </div>
          <div class="achievement-item">
            <div class="achievement-date text-xs text-gray-400">Sept 23, 2024</div>
            <div class="achievement-text">Led successful sprint planning session</div>
          </div>
          <div class="achievement-item">
            <div class="achievement-date text-xs text-gray-400">Sept 20, 2024</div>
            <div class="achievement-text">Mentored junior developer on TypeScript</div>
          </div>
        </div>
        <div class="mt-4">
          <router-link to="/weekly-log" class="btn btn-primary">Add New Entry</router-link>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Quick Actions</h3>
          <p class="card-subtitle">Get started with common tasks</p>
        </div>
        <div class="action-grid grid-cols-1 gap-3">
          <router-link to="/weekly-log" class="action-item">
            <div class="action-icon">📝</div>
            <div class="action-content">
              <div class="action-title">Log This Week</div>
              <div class="action-description text-sm text-gray-500">
                Record your achievements and learnings
              </div>
            </div>
          </router-link>
          <router-link to="/achievements" class="action-item">
            <div class="action-icon">🏆</div>
            <div class="action-content">
              <div class="action-title">View Achievements</div>
              <div class="action-description text-sm text-gray-500">
                Browse your complete history
              </div>
            </div>
          </router-link>
          <router-link to="/insights" class="action-item">
            <div class="action-icon">📊</div>
            <div class="action-content">
              <div class="action-title">Review Insights</div>
              <div class="action-description text-sm text-gray-500">
                Analyze your progress patterns
              </div>
            </div>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Dashboard logic will be added here
</script>

<style scoped>
.dashboard-grid {
  display: grid;
}

.dashboard-content {
  display: grid;
}

.stat-value {
  display: flex;
  align-items: baseline;
}

.achievement-list {
  space-y: 1rem;
}

.achievement-item {
  padding: 0.75rem 0;
  border-bottom: 1px solid #f3f4f6;
}

.achievement-item:last-child {
  border-bottom: none;
}

.achievement-text {
  font-weight: 500;
  color: #374151;
  margin-top: 0.25rem;
}

.action-grid {
  display: grid;
}

.action-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  text-decoration: none;
  transition: all 0.2s ease;
}

.action-item:hover {
  border-color: #3b82f6;
  background: #f8fafc;
}

.action-icon {
  font-size: 1.5rem;
  margin-right: 0.75rem;
}

.action-title {
  font-weight: 500;
  color: #374151;
}

.text-blue-600 {
  color: #2563eb;
}
.text-green-600 {
  color: #16a34a;
}
.text-purple-600 {
  color: #9333ea;
}
</style>
