<script setup>
import { reactive } from 'vue';
import SearchableDropdown from '../components/SearchableDropdown.vue';
import { BASE_EXERCISES } from '../constants.js';

const form = reactive({
  date: new Date().toISOString().split('T')[0],
  exercise: '',
  weight: '',
  reps: ''
});
</script>

<template>
  <div class="view-container">
    <div class="header-section">
      <div class="title-area">
        <label class="welcome">Input</label>
        <h1>Training Log</h1>
      </div>
    </div>
    
    <div class="glass-card form-container">
      <h3>New Session (PoC)</h3>
      
      <div class="form-group">
        <label>Date</label>
        <input type="date" class="glass-input" v-model="form.date" />
      </div>

      <div class="form-group">
        <label>Exercise</label>
        <SearchableDropdown 
          v-model="form.exercise" 
          :options="BASE_EXERCISES" 
          placeholder="Search or add exercise..."
        />
      </div>

      <div class="form-row">
        <div class="form-group half">
          <label>Weight (KG)</label>
          <input type="number" class="glass-input" v-model="form.weight" placeholder="e.g. 100" />
        </div>
        <div class="form-group half">
          <label>Reps</label>
          <input type="number" class="glass-input" v-model="form.reps" placeholder="e.g. 5" />
        </div>
      </div>

      <div class="preview-box">
        <h4>Current Input State:</h4>
        <p><strong>Exercise:</strong> {{ form.exercise || 'None selected' }}</p>
        <div class="debug-badges">
          <span v-if="BASE_EXERCISES.includes(form.exercise)" class="badge internal">Built-in</span>
          <span v-else-if="form.exercise" class="badge custom">Custom Saved</span>
        </div>
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

.form-container {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

h3 {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 20px;
  color: #1f2937;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.half {
  flex: 1;
}

label {
  font-size: 13px;
  font-weight: 600;
  color: #4b5563;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

input[type="date"], input[type="number"] {
  width: 100%;
  box-sizing: border-box;
}

.preview-box {
  margin-top: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.preview-box h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #6b7280;
}

.preview-box p {
  margin: 0;
  font-size: 16px;
  color: #111827;
}

.debug-badges {
  margin-top: 8px;
  min-height: 24px;
}

.badge {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.badge.internal {
  background: #e0e7ff;
  color: #4338ca;
}

.badge.custom {
  background: #d1fae5;
  color: #047857;
}
</style>
