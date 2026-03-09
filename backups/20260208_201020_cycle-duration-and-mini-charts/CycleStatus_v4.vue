<script setup>


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
      <div class="left-section">
        <div class="icon-container" :class="status.toLowerCase()">
          <span v-if="status === 'Linear'">📈</span>
          <span v-else>🐂</span>
        </div>
        <div class="info">
          <label class="label">Current Cycle</label>
          <div class="status-main">{{ status }} Mode</div>
        </div>
      </div>
      <div class="right-section">
        <span class="week-pill">Week {{ weeks }}</span>
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
  justify-content: space-between;
  align-items: center;
}

.left-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.right-section {
  display: flex;
  align-items: center;
}

.icon-container {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
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

.status-main {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.2;
}

.week-pill {
  padding: 6px 10px;
  background: rgba(142, 142, 147, 0.15); /* Slightly transparent background */
  border-radius: 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary); /* Darker text for better contrast */
}
</style>
