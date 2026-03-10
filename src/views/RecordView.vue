<script setup>
import { reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import SearchableDropdown from '../components/SearchableDropdown.vue';
import { BASE_EXERCISES } from '../constants.js';
import { useSessionStore } from '../stores/sessionStore.js';

const router = useRouter();
const sessionStore = useSessionStore();

const form = reactive({
  date: new Date().toISOString().split('T')[0],
  exercise: '',
  weight: '',
  reps: ''
});

const fatForm = reactive({
  date: new Date().toISOString().split('T')[0],
  fatPercentage: '',
  bodyWeight: ''
});

const canSubmit = computed(() => {
  return form.date && form.exercise && form.weight && form.reps;
});

const canSubmitFat = computed(() => {
  return fatForm.date && (fatForm.fatPercentage || fatForm.bodyWeight);
});

const currentFatRecord = computed(() => {
  return sessionStore.bodyMetrics.find(item => item.date === fatForm.date);
});

import { watch } from 'vue';

watch(currentFatRecord, (newRecord) => {
  if (newRecord) {
    fatForm.fatPercentage = newRecord.fatPercentage !== undefined ? newRecord.fatPercentage : '';
    fatForm.bodyWeight = newRecord.bodyWeight !== undefined ? newRecord.bodyWeight : '';
  } else {
    fatForm.fatPercentage = '';
    fatForm.bodyWeight = '';
  }
}, { immediate: true });

const savedSessions = computed(() => sessionStore.sessions);

// Load from Store on Mount
onMounted(() => {
  if (sessionStore.sessions.length === 0) {
    sessionStore.fetchSessions();
  }
});

const submitLog = async () => {
  if (!canSubmit.value) return;
  
  const newRecord = {
    date: form.date,
    exercise: form.exercise,
    weight: Number(form.weight),
    reps: Number(form.reps)
  };

  try {
    await sessionStore.addSession(newRecord);

    // Provide some visual feedback
    const btn = document.querySelector('.submit-btn.training');
    if (btn) {
      const originalText = btn.innerText;
      btn.innerText = 'Saved!';
      btn.style.background = '#059669'; // darker green
      
      setTimeout(() => {
        btn.innerText = originalText;
        btn.style.background = ''; // restore
      }, 1500);
    }
  } catch (err) {
    console.error("Failed to save via store", err);
    alert('Failed to save your session. Please check your connection.');
  }
};

const submitFatLog = async () => {
  if (!canSubmitFat.value) return;
  
  const newRecord = {
    date: fatForm.date
  };

  if (fatForm.fatPercentage !== '') {
    newRecord.fatPercentage = Number(fatForm.fatPercentage);
  }

  if (fatForm.bodyWeight !== '') {
    newRecord.bodyWeight = Number(fatForm.bodyWeight);
  }

  try {
    await sessionStore.addBodyMetric(newRecord);

    // Provide some visual feedback
    const btn = document.querySelector('.submit-btn.fat');
    if (btn) {
      const originalText = btn.innerText;
      btn.innerText = 'Updated!';
      btn.style.background = '#059669'; // darker green
      
      setTimeout(() => {
        btn.innerText = originalText;
        btn.style.background = ''; // restore
      }, 1500);
    }
  } catch (err) {
    console.error("Failed to save body metric", err);
    alert('Failed to save your body fat data. Please check your connection.');
  }
};

const deleteFatLog = async () => {
  const record = currentFatRecord.value;
  if (!record) return;
  
  if (!confirm(`Are you sure you want to delete the body fat record for ${record.date}?`)) return;

  try {
    await sessionStore.deleteBodyMetric(record.date);
    fatForm.fatPercentage = '';
    fatForm.bodyWeight = '';
  } catch (err) {
    console.error("Failed to delete body metric", err);
    alert('Failed to delete your body fat data.');
  }
};

const groupedSessions = computed(() => {
  const groups = {};
  
  // Safely get the sessions array
  const sessionsArray = Array.isArray(savedSessions.value) ? savedSessions.value : [];
  
  // Group by Date + Exercise, but ONLY for the currently selected date
  sessionsArray
    .filter(session => session && session.date === form.date && session.exercise)
    .forEach(session => {
      // Create a normalized Date key
      const dateKey = session.date;
      const key = `${dateKey}_${session.exercise}`;
      
      if (!groups[key]) {
        groups[key] = {
          id: key,
          date: dateKey,
          exercise: session.exercise,
          sets: []
        };
      }
      
      groups[key].sets.push({
        id: session.id || Date.now() + Math.random(),
        weight: session.weight,
        reps: session.reps
      });
    });
  
  // Return as sorted array (newest first based on string comparison of keys)
  return Object.values(groups).sort((a, b) => b.id.localeCompare(a.id));
});
</script>

<template>
  <div class="view-container">
    <div class="header-section">
      <div class="title-area">
        <label class="welcome">Record</label>
        <h1>Daily Log Hub</h1>
      </div>
    </div>
    
    <h3 class="section-title">Body Metrics</h3>
    <!-- iOS 16 Grouped List Form (Fat) -->
    <div class="ios-list-group glass-card">
      <div class="ios-list-item">
        <label>Date</label>
        <input type="date" class="ios-input" v-model="fatForm.date" />
      </div>

      <div class="ios-list-item">
        <label>Body Weight <span class="unit">(KG)</span></label>
        <input type="number" inputmode="decimal" class="ios-input num-input" v-model="fatForm.bodyWeight" placeholder="0.0" />
      </div>

      <div class="ios-list-item">
        <label>Body Fat <span class="unit">(%)</span></label>
        <input type="number" inputmode="decimal" class="ios-input num-input" v-model="fatForm.fatPercentage" placeholder="0.0" />
      </div>
    </div>
    <div class="fat-btn-group">
      <button 
        class="submit-btn fat" 
        :disabled="!canSubmitFat"
        @click="submitFatLog"
      >
        {{ currentFatRecord ? 'Update Body Metrics' : 'Save Body Metrics' }}
      </button>
      
      <button 
        v-if="currentFatRecord"
        class="delete-btn" 
        @click="deleteFatLog"
      >
        Delete
      </button>
    </div>
    
    <div style="height: 12px;"></div> <!-- Spacer -->
    
    <h3 class="section-title">Training</h3>
    <!-- iOS 16 Grouped List Form (Training) -->
    <div class="ios-list-group glass-card">
      <div class="ios-list-item">
        <label>Date</label>
        <input type="date" class="ios-input" v-model="form.date" />
      </div>

      <div class="ios-list-item">
        <label>Exercise</label>
        <div class="ios-input-wrapper">
          <SearchableDropdown 
            v-model="form.exercise" 
            :options="BASE_EXERCISES" 
            placeholder="Select..."
          />
        </div>
      </div>
      
      <div class="ios-list-item">
        <label>Weight <span class="unit">(KG)</span></label>
        <input type="number" inputmode="decimal" class="ios-input num-input" v-model="form.weight" placeholder="0" />
      </div>

      <div class="ios-list-item">
        <label>Reps</label>
        <input type="number" inputmode="decimal" class="ios-input num-input" v-model="form.reps" placeholder="0" />
      </div>
    </div>

    <button 
      class="submit-btn training" 
      :disabled="!canSubmit"
      @click="submitLog"
    >
      Save Session
    </button>

    <div v-if="savedSessions.length > 0" class="history-section">
      <h3 class="section-title">Saved Sessions</h3>
      <div class="ios-list-group glass-card session-list">
        <div v-for="group in groupedSessions" :key="group.id" class="session-card" @click="router.push({ path: '/program/session', query: { date: group.date, exercise: group.exercise } })">
          <div class="session-header">
            <span class="exercise-name">{{ group.exercise }}</span>
            <span class="session-date">{{ group.date }}</span>
          </div>
          <div class="sets-container">
            <div v-for="(set, index) in group.sets" :key="set.id" class="set-row">
              <span class="set-number">Set {{ index + 1 }}</span>
              <div class="set-metrics">
                <span class="metric"><strong>{{ set.weight }}</strong> kg</span>
                <span class="metric"><strong>{{ set.reps }}</strong> reps</span>
              </div>
            </div>
          </div>
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
  background: linear-gradient(135deg, var(--text-primary) 0%, var(--accent-color) 100%);
  background-clip: text;
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

/* iOS 16 Grouped List Styling */
.ios-list-group {
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Contains inner borders */
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

.ios-list-item label {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary, #ffffff);
  text-transform: none;
  letter-spacing: 0;
  flex-shrink: 0;
  width: 90px; /* Fixed width for alignment */
}

.unit {
  font-size: 13px;
  color: var(--text-secondary);
}

.ios-input-wrapper {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  min-width: 0;
}

.ios-input {
  flex: 1;
  background: transparent;
  border: none;
  font-size: 18px;
  font-weight: 600;
  color: #10b981; /* Emerald for inputs */
  text-align: right;
  padding: 0;
  outline: none;
  -webkit-appearance: none;
  appearance: none; /* remove native styling */
  min-width: 0;
}

input[type="date"].ios-input {
  direction: rtl; /* Force date text to right in Safari */
}

.ios-input::placeholder {
  color: rgba(255, 255, 255, 0.2);
}

input.num-input {
  font-size: 24px;
}

/* Kills the ugly HTML number spinner arrows */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"] {
  -moz-appearance: textfield; /* Firefox */
  appearance: textfield;
}

/* Submit Button */
.submit-btn {
  margin-top: 8px;
  padding: 18px;
  background: var(--color-primary, #10b981);
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  width: 100%;
}

.submit-btn:disabled {
  background: rgba(118, 118, 128, 0.24);
  color: rgba(255, 255, 255, 0.3);
  cursor: not-allowed;
  box-shadow: none;
}

.fat-btn-group {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.fat-btn-group .submit-btn {
  margin-top: 0;
  flex: 1;
}

.delete-btn {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 16px;
  padding: 0 24px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.delete-btn:active {
  background: rgba(239, 68, 68, 0.2);
}

.history-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  padding-left: 16px;
  margin: 0;
}

.badge.internal {
  background: #e0e7ff;
  color: #4338ca;
}

.badge.custom {
  background: #d1fae5;
  color: #047857;
}

.session-list {
  display: flex;
  flex-direction: column;
  padding: 0;
}

.session-card {
  padding: 16px;
  cursor: pointer;
  transition: background 0.2s ease;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.session-card:last-child {
  border-bottom: none;
}

.session-card:active {
  background: rgba(255, 255, 255, 0.1);
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.exercise-name {
  font-weight: 700;
  font-size: 18px;
  color: var(--text-primary);
}

.session-date {
  font-size: 12px;
  color: var(--text-secondary, #a1a1aa);
}

.sets-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed rgba(255, 255, 255, 0.2);
}

.set-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.set-number {
  color: var(--text-secondary, #a1a1aa);
  font-weight: 500;
  font-size: 13px;
}

.set-metrics {
  display: flex;
  gap: 16px;
}

.metric {
  color: var(--text-primary, #e4e4e7);
}


</style>
