<script setup>
import { ref, watch, onMounted } from 'vue';

const STORAGE_KEY = 'PR_SETTINGS';

const settings = ref({
  notifyStaleExercise: true,
  notifyNoTraining: true,
  notifyNoBodyFat: true
});

onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    Object.assign(settings.value, JSON.parse(saved));
  }
});

// Auto-save on change
watch(settings, (newVal) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal));
}, { deep: true });

</script>

<template>
  <div class="view-container">
    <div class="header-section">
      <div class="title-area">
        <label class="welcome">Preferences</label>
        <h1>Settings</h1>
      </div>
    </div>
    
    <h3 class="section-title">LINE Notifications</h3>
    <p class="section-desc">Stay accountable with smart reminders sent directly to your LINE.</p>
    
    <div class="ios-list-group glass-card">
      <!-- Feature 1: 4 Weeks Stale Exercise -->
      <div class="ios-list-item">
        <div class="item-text">
          <label>Stale Routine Alert</label>
          <span class="sub-label">連續 4 週未更換訓練動作 (3RM/5RM)</span>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="settings.notifyStaleExercise">
          <span class="slider round"></span>
        </label>
      </div>
      
      <!-- Feature 2: 7 Days No Training -->
      <div class="ios-list-item">
        <div class="item-text">
          <label>Training Inactivity</label>
          <span class="sub-label">連續 7 天未見訓練紀錄</span>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="settings.notifyNoTraining">
          <span class="slider round"></span>
        </label>
      </div>

      <!-- Feature 3: 14 Days No Body Fat -->
      <div class="ios-list-item">
        <div class="item-text">
          <label>Missed Body Metrics</label>
          <span class="sub-label">連續 14 天未測量體脂</span>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="settings.notifyNoBodyFat">
          <span class="slider round"></span>
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.view-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.header-section {
  padding: 0 4px;
}

.title-area h1 {
  font-size: 34px;
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.welcome {
  display: block;
  font-size: 13px;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 1px;
  font-weight: 600;
  margin-bottom: 4px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  padding-left: 16px;
  margin: 0 0 -8px 0;
}

.section-desc {
  font-size: 13px;
  color: var(--text-secondary);
  padding-left: 16px;
  margin: 0 0 4px 0;
  line-height: 1.4;
  opacity: 0.8;
}

/* iOS 16 Grouped List Styling */
.ios-list-group {
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ios-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: transparent;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.ios-list-item:last-child {
  border-bottom: none;
}

.item-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-text label {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary, #ffffff);
}

.sub-label {
  font-size: 12px;
  color: var(--text-secondary, #a1a1aa);
}

/* iOS Style Toggle Switch */
.switch {
  position: relative;
  display: inline-block;
  width: 51px;
  height: 31px;
  flex-shrink: 0;
}

.switch input { 
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(120, 120, 128, 0.32); /* iOS unselected gray */
  transition: .3s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 27px;
  width: 27px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: .3s;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15), 0 3px 1px rgba(0, 0, 0, 0.06);
}

input:checked + .slider {
  background-color: #34C759; /* iOS green */
}

input:focus + .slider {
  box-shadow: 0 0 1px #34C759;
}

input:checked + .slider:before {
  transform: translateX(20px);
}

/* Rounded sliders */
.slider.round {
  border-radius: 31px;
}

.slider.round:before {
  border-radius: 50%;
}
</style>
