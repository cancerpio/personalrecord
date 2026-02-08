<script setup>
import { EXERCISES, RM_TYPES } from '../mock/data';

const props = defineProps({
  filters: Object
});

const emit = defineEmits(['update:filters']);

const years = [2023, 2024, 2025, 2026];
const months = Array.from({length: 12}, (_, i) => i + 1);

function update(key, value) {
  emit('update:filters', { ...props.filters, [key]: value });
}
</script>

<template>
  <div class="filter-controls glass-card">
    <div class="control-group">
      <label class="label">RM Type</label>
      <div class="segmented-control">
        <button 
          v-for="type in RM_TYPES" 
          :key="type"
          :class="{ active: filters.rmType === type }"
          @click="update('rmType', type)"
        >
          {{ type }}
        </button>
      </div>
    </div>

    <div class="control-group">
      <label class="label">Exercise</label>
      <select 
        :value="filters.exercise" 
        @change="e => update('exercise', e.target.value)"
        class="glass-input"
      >
        <option value="all">All Exercises</option>
        <option v-for="ex in EXERCISES" :key="ex.id" :value="ex.id">
          {{ ex.name }}
        </option>
      </select>
    </div>

    <div class="control-group date-group">
      <div class="sub-group">
        <label class="label">Year</label>
        <select 
          :value="filters.year"
          @change="e => update('year', parseInt(e.target.value))"
          class="glass-input"
        >
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
      <div class="sub-group">
        <label class="label">Month</label>
        <select 
          :value="filters.month" 
          @change="e => update('month', parseInt(e.target.value))"
          class="glass-input"
        >
          <option v-for="m in months" :key="m" :value="m">{{ m }}月</option>
        </select>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-group {
  display: flex;
  flex-direction: column;
}

.date-group {
  flex-direction: row;
  gap: 12px;
}

.sub-group {
  flex: 1;
}

/* Segmented Control */
.segmented-control {
  display: flex;
  background: rgba(118, 118, 128, 0.12);
  border-radius: 8px;
  padding: 2px;
}

.segmented-control button {
  flex: 1;
  border: none;
  background: transparent;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-primary);
  opacity: 0.8;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.segmented-control button.active {
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 3px 8px rgba(0,0,0,0.12), 0 3px 1px rgba(0,0,0,0.04);
  font-weight: 600;
  color: #000000; /* Force black text for active state */
}

/* Glass Input/Select */
.glass-input {
  appearance: none;
  background: rgba(118, 118, 128, 0.12);
  border: none;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 15px;
  color: var(--text-primary);
  width: 100%;
  outline: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 16px;
}
</style>
