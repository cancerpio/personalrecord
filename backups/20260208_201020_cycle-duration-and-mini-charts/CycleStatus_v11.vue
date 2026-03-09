<script setup>
import { computed } from 'vue';
import DAMNCover from '@/assets/images/damn.jpg';
import BokuwaCover from '@/assets/images/bokuwa.jpg';

const props = defineProps({
  status: {
    type: String,
    default: 'Linear'
  },
  weeks: {
    type: Number,
    default: 1
  }
});

const alertLevel = computed(() => {
  if (props.weeks > 8) return 'critical';
  if (props.weeks > 4) return 'warning';
  return null;
});

const alertMessage = computed(() => {
  if (props.weeks > 8) return 'Change Cycle!';
  if (props.weeks > 4) return 'Consider Changing';
  return '';
});
</script>

<template>
  <div class="cycle-card glass-card">
    <div class="content">
      <div class="left-section">
        <!-- iOS Style Album Art Shadow -->
        <div class="album-art shadow-ios">
          <img 
            v-if="status === 'Linear'" 
            :src="BokuwaCover" 
            alt="Linear Cycle"
          >
          <img 
            v-else 
            :src="DAMNCover" 
            alt="Texas Cycle"
          >
        </div>
        <div class="info">
          <label class="label">Current Cycle</label>
          <div class="status-main">{{ status }} Mode</div>
        </div>
      </div>
      <div class="right-section">
        <div class="week-pill" :class="alertLevel">
          <span v-if="alertLevel === 'critical'" class="alert-icon">⚠️</span>
          <span v-else-if="alertLevel === 'warning'" class="alert-icon">⚡</span>
          Week {{ weeks }}
        </div>
        <div v-if="alertLevel" class="alert-text" :class="alertLevel">
          {{ alertMessage }}
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
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.album-art {
  width: 54px;
  height: 54px;
  border-radius: 8px; /* iOS standard for small artwork */
  overflow: hidden;
  background: #e0e0e0;
}

.album-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.shadow-ios {
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.info {
  display: flex;
  flex-direction: column;
}

.status-main {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.2;
}

.week-pill {
  padding: 6px 10px;
  background: rgba(142, 142, 147, 0.15);
  border-radius: 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.week-pill.warning {
  background: rgba(255, 149, 0, 0.15); /* Orange/Amber tint */
  color: #FF9500; /* iOS System Orange */
}

.week-pill.critical {
  background: rgba(255, 59, 48, 0.15); /* Red tint */
  color: #FF3B30; /* iOS System Red */
}

.alert-text {
  font-size: 11px;
  font-weight: 500;
}

.alert-text.warning { color: #FF9500; }
.alert-text.critical { color: #FF3B30; }
</style>
