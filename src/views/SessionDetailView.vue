<script setup>
import { computed, watch, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from '../stores/sessionStore.js';

const route = useRoute();
const router = useRouter();
const sessionStore = useSessionStore();

const queryDate = route.query.date;
const queryExercise = route.query.exercise;

// All sets that match the date and exercise
const activeSets = computed(() => {
  return sessionStore.sessions.filter(s => s.date === queryDate && s.exercise === queryExercise);
});

// A local reactive copy of the sets so we can edit before saving
const editedSets = ref([]);

// Sync local copy when active sets change
watch(activeSets, (newSets) => {
  editedSets.value = newSets.map(s => ({ ...s }));
}, { immediate: true });

const deleteSet = async (id) => {
  if (!confirm('Are you sure you want to delete this recorded set?')) return;
  
  try {
    await sessionStore.deleteSession(id);
    if (activeSets.value.length === 0) {
      router.back(); // Auto return if no sets left
    }
  } catch (err) {
    alert('Failed to delete set.');
  }
};

const saveSet = async (editedSet) => {
  try {
    await sessionStore.updateSession(editedSet.id, {
      weight: Number(editedSet.weight),
      reps: Number(editedSet.reps)
    });
    alert('Saved!');
  } catch (err) {
    alert('Failed to save set changes.');
  }
}

const goBack = () => router.back();
</script>

<template>
  <div class="view-container">
    <div class="header-section">
      <div class="title-area">
        <label class="welcome">{{ queryDate }}</label>
        <h1>{{ queryExercise }}</h1>
      </div>
    </div>
    
    <div v-if="editedSets.length > 0" class="form-container">
      <div v-for="(set, index) in editedSets" :key="set.id" class="set-editor glass-card">
        <div class="set-header">
          <h3>Set {{ index + 1 }}</h3>
          <button class="delete-icon-btn" @click="deleteSet(set.id)">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>

        <div class="ios-list-group">
          <div class="ios-list-item">
            <label>Weight <span class="unit">(KG)</span></label>
            <input type="number" inputmode="decimal" class="ios-input num-input" v-model="set.weight" />
          </div>
          <div class="ios-list-item">
            <label>Reps</label>
            <input type="number" inputmode="decimal" class="ios-input num-input" v-model="set.reps" />
          </div>
        </div>

        <button class="submit-btn update" @click="saveSet(set)">
          Update Set
        </button>
      </div>
    </div>
    
    <div v-else class="empty-state glass-card">
      <p>No records found. They may have been deleted.</p>
      <button class="submit-btn" @click="goBack" style="margin-top: 16px;">Go Back</button>
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

.form-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-bottom: 24px;
}

.set-editor {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.set-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px 8px 8px;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.2);
}

.set-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
}

.delete-icon-btn {
  background: transparent;
  border: none;
  color: #ef4444;
  padding: 8px;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.delete-icon-btn:active {
  background: rgba(239, 68, 68, 0.1);
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
  padding: 12px 8px;
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
  width: 90px;
}

.unit {
  font-size: 13px;
  color: var(--text-secondary);
}

.ios-input {
  flex: 1;
  background: transparent;
  border: none;
  font-size: 18px;
  font-weight: 600;
  color: #10b981;
  text-align: right;
  padding: 0;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  min-width: 0;
}

.num-input {
  font-size: 22px;
}

/* Kills the ugly HTML number spinner arrows */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Submit Button */
.submit-btn {
  margin-top: 8px;
  padding: 16px;
  background: var(--color-primary, #10b981);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
}

.submit-btn.update {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.submit-btn.update:active {
  background: rgba(16, 185, 129, 0.25);
}

.empty-state {
  padding: 32px;
  text-align: center;
  color: var(--text-secondary);
}
</style>
