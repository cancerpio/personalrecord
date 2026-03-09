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

const canSubmit = computed(() => {
  return form.date && form.exercise && form.weight && form.reps;
});

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
    const btn = document.querySelector('.submit-btn');
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
        <label class="welcome">Input</label>
        <h1>Program Record</h1>
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
          placeholder="Search or add exercise (v2)..."
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

      <button 
        class="submit-btn" 
        :disabled="!canSubmit"
        @click="submitLog"
      >
        Save Session
      </button>
    </div>

    <div v-if="savedSessions.length > 0" class="glass-card history-container">
      <h3>Saved Sessions</h3>
      <div class="session-list">
        <div v-for="group in groupedSessions" :key="group.id" class="session-card" @click="router.push('/program/session')">
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

.history-container {
  padding: 24px;
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.session-card {
  background: rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: background 0.2s ease;
}

.session-card:active {
  background: rgba(255, 255, 255, 0.6);
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.exercise-name {
  font-weight: 700;
  font-size: 16px;
  color: #111827;
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

.submit-btn {
  margin-top: 8px;
  padding: 16px;
  background: var(--color-primary, #10b981);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.submit-btn:disabled {
  background: #d1d5db;
  color: #9ca3af;
  cursor: not-allowed;
  box-shadow: none;
}

.submit-btn:not(:disabled):active {
  transform: translateY(2px);
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
}
</style>
