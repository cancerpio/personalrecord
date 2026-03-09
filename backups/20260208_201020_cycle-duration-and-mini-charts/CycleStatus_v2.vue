<script setup>
import { defineProps } from 'vue';

defineProps({
  status: {
    type: String,
    default: 'Linear'
  },
  weeks: {
    type: Number,
    default: 1
  }
});
</script>

<template>
  <div class="cycle-card glass-card">
    <div class="content">
      <div class="icon-container" :class="status.toLowerCase()">
        <span v-if="status === 'Linear'">📈</span>
        <span v-else>🐂</span>
      </div>
      <div class="info">
        <label class="label">Current Cycle</label>
        <div class="status-row">
          <div class="status-text">{{ status }} Mode</div>
          <div class="week-pill">Week {{ weeks }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cycle-card {
  padding: 16px;
}

.content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon-container {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: rgba(255, 255, 255, 0.5);
}

.icon-container.linear {
  background: rgba(52, 199, 89, 0.2);
  color: #34C759;
}

.icon-container.texas {
  background: rgba(255, 59, 48, 0.2);
  color: #FF3B30;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-text {
  font-size: 19px;
  font-weight: 600;
  color: var(--text-primary);
}

.week-pill {
  padding: 4px 8px;
  background: rgba(142, 142, 147, 0.2);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}
</style>
