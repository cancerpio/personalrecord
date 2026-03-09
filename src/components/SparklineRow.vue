<script setup>
import { computed } from 'vue';

const props = defineProps({
  data: Object
});

// Helper to determine background, color and svg type based on status
const statusInfo = computed(() => {
  if (props.data.trend === 'up') {
    return { 
      type: 'up', 
      color: '#10b981', 
      bg: 'rgba(16, 185, 129, 0.15)' 
    };
  } else if (props.data.trend === 'down') {
    return { 
      type: 'down', 
      color: '#ef4444', 
      bg: 'rgba(239, 68, 68, 0.15)' 
    };
  } else if (props.data.statusLabel === '—') {
    return { 
      type: 'none', 
      color: '#a1a1aa', 
      bg: 'rgba(161, 161, 170, 0.15)' 
    };
  }
  
  // Stable
  return { 
    type: 'stable', 
    color: '#fb923c', 
    bg: 'rgba(251, 146, 60, 0.15)' 
  };
});
</script>

<template>
  <div class="status-pill">
    <div class="info-col">
      <div 
        class="icon-container" 
        :style="{ color: statusInfo.color, backgroundColor: statusInfo.bg }"
      >
        <!-- UP ARROW -->
        <svg v-if="statusInfo.type === 'up'" class="chart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
          <polyline points="17 6 23 6 23 12"></polyline>
        </svg>

        <!-- DOWN ARROW -->
        <svg v-else-if="statusInfo.type === 'down'" class="chart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
          <polyline points="17 18 23 18 23 12"></polyline>
        </svg>
        
        <!-- STABLE ARROW -->
        <svg v-else-if="statusInfo.type === 'stable'" class="chart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <polyline points="15 5 22 12 15 19"></polyline>
        </svg>

        <!-- NO DATA -->
        <svg v-else class="chart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </div>
      <span class="ex-name">{{ data.label }}</span>
    </div>
    <div class="status-col">
      <span class="status-label" :class="{ 'warning-text': data.trend === 'same' && data.data.length >= 2 }">
        {{ data.statusLabel === '—' ? '—' : `→ ${data.statusLabel}` }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.status-pill {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(45, 45, 45, 0.8);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.info-col {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-container {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  flex-shrink: 0;
}

.chart-icon {
  width: 24px;
  height: 24px;
}

.ex-name {
  font-weight: 600;
  font-size: 16px;
  color: #f4f4f5;
}

.status-col {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.status-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary, #a1a1aa);
  white-space: nowrap;
}

.warning-text {
  /* Give the stable warning text a bit more visibility like the screenshot */
  color: #fb923c; /* subtle orange/yellow */
}
</style>
