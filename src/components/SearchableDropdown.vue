<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  options: {
    type: Array,
    default: () => []
  },
  placeholder: {
    type: String,
    default: 'Select or type to add...'
  }
});

const emit = defineEmits(['update:modelValue']);

const isOpen = ref(false);
const internalSearchQuery = ref(props.modelValue);
const customOptions = ref([]);
const dropdownRef = ref(null);
const inputRef = ref(null);

watch(() => props.modelValue, (newVal) => {
  internalSearchQuery.value = newVal;
});

// Load custom options from localStorage on mount
onMounted(() => {
  const stored = localStorage.getItem('PR_CUSTOM_EXERCISES');
  if (stored) {
    try {
      customOptions.value = JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse custom exercises', e);
    }
  }
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isOpen.value = false;
    // Reset search query to actual selected value if user clicks away without adding
    if (internalSearchQuery.value !== props.modelValue) {
        internalSearchQuery.value = props.modelValue;
    }
  }
};

const allOptions = computed(() => {
  const combined = [...customOptions.value, ...props.options];
  return [...new Set(combined)];
});

const filteredOptions = computed(() => {
  if (!internalSearchQuery.value) return allOptions.value;
  const lowerQuery = String(internalSearchQuery.value).toLowerCase();
  return allOptions.value.filter(opt => 
    opt && String(opt).toLowerCase().includes(lowerQuery)
  );
});

const canAdd = computed(() => {
  if (!internalSearchQuery.value) return false;
  const q = String(internalSearchQuery.value).trim();
  if (q === '') return false;
  
  const lowerQuery = q.toLowerCase();
  const exactMatchExists = allOptions.value.some(opt => opt && String(opt).toLowerCase() === lowerQuery);
  return !exactMatchExists;
});

const toggleDropdown = () => {
  isOpen.value = true;
  internalSearchQuery.value = ''; // clear input so user can see all options when opening
};

const focusInput = () => {
  if (inputRef.value) {
    inputRef.value.focus();
  }
};

const handleInput = (event) => {
  internalSearchQuery.value = event.target.value;
  isOpen.value = true;
};

const selectOption = (option) => {
  internalSearchQuery.value = option;
  emit('update:modelValue', option);
  isOpen.value = false;
};

const addNewOption = () => {
  if (!internalSearchQuery.value) return;
  const newOption = String(internalSearchQuery.value).trim();
  if (!newOption) return;
  
  const formattedOption = newOption.replace(/\b\w/g, l => l.toUpperCase());

  if (!allOptions.value.includes(formattedOption)) {
    customOptions.value.unshift(formattedOption); 
    localStorage.setItem('PR_CUSTOM_EXERCISES', JSON.stringify(customOptions.value));
  }
  
  selectOption(formattedOption);
};
</script>

<template>
  <div class="searchable-dropdown" ref="dropdownRef">
    <div class="input-wrapper">
      <input 
        ref="inputRef"
        type="text" 
        class="dropdown-input"
        :value="internalSearchQuery"
        :placeholder="isOpen ? 'Search...' : (modelValue || placeholder)"
        @input="handleInput"
        @focus="isOpen = true"
        @click="toggleDropdown"
      />
      <div class="dropdown-icon" :class="{ 'is-open': isOpen }">
        ▼
      </div>
    </div>

    <div v-show="isOpen" class="dropdown-menu glass-panel">
      <!-- Options List -->
      <ul v-if="filteredOptions.length > 0" class="options-list">
        <li 
          v-for="option in filteredOptions" 
          :key="option"
          class="option-item"
          @mousedown.prevent="selectOption(option)"
        >
          {{ option }}
          <span v-if="customOptions.includes(option)" class="custom-badge">Custom</span>
        </li>
      </ul>
      
      <!-- Empty state if no matches -->
      <div v-else class="empty-state">
        No matches found.
      </div>

      <!-- Add New Button Area -->
      <div class="add-new-action">
        <button v-if="canAdd" class="add-btn" @mousedown.prevent="addNewOption">
          <span class="plus-icon">+</span> Add "{{ String(internalSearchQuery).trim() }}"
        </button>
        <button v-else-if="!String(internalSearchQuery).trim()" class="add-btn neutral" @mousedown.prevent="focusInput">
          <span class="plus-icon">+</span> Type above to add custom exercise...
        </button>
        <button v-else class="add-btn disabled" disabled>
          "{{ String(internalSearchQuery).trim() }}" is already in the list
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.searchable-dropdown {
  position: relative;
  width: 100%;
}

.input-wrapper {
  position: relative;
  width: 100%;
}

.dropdown-input {
  width: 100%;
  padding-right: 32px; /* space for icon */
  box-sizing: border-box;
  font-size: 18px; /* Bigger font for iOS look */
  font-weight: 600;
  color: #10b981; /* Emerald text, matches right-aligned inputs */
  text-align: right;
  cursor: text;
  background-color: transparent;
  border: none;
  outline: none;
  appearance: none;
}

.dropdown-input::placeholder {
  color: rgba(255, 255, 255, 0.2);
  font-weight: 500;
}

.dropdown-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  color: var(--text-secondary, #8E8E93);
  pointer-events: none;
  transition: transform 0.2s ease;
}

.dropdown-icon.is-open {
  transform: translateY(-50%) rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  max-height: 250px;
  z-index: 100;
  padding: 8px 0 0 0; /* remove bottom padding so sticky button fits */
  display: flex;
  flex-direction: column;
  background: var(--bg-card, rgba(255, 255, 255, 0.1));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  overflow: hidden; /* Contains the children */
}

.options-list {
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  max-height: 200px;
}

.option-item {
  padding: 12px 16px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.15s ease;
  font-size: 15px;
}

.option-item:hover, .option-item:active {
  background-color: rgba(0, 0, 0, 0.05);
}

.custom-badge {
  font-size: 10px;
  background: var(--color-primary, #10b981);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
}

.empty-state {
  padding: 12px 16px;
  color: var(--text-secondary, #a1a1aa);
  font-size: 14px;
  text-align: center;
}

.add-new-action {
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: auto; /* keeps it at bottom */
  position: sticky;
  bottom: 0;
  z-index: 10;
}

.add-btn {
  width: 100%;
  background: rgba(16, 185, 129, 0.1); /* Primary color light */
  color: var(--color-primary, #10b981);
  border: none;
  border-radius: 8px;
  padding: 10px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.add-btn:active {
  background: rgba(16, 185, 129, 0.2);
}

.add-btn.neutral {
  background: transparent;
  color: #6b7280;
  border: 1px dashed rgba(0, 0, 0, 0.1);
}

.add-btn.disabled {
  background: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
  font-weight: 500;
}

.plus-icon {
  font-size: 16px;
  font-weight: bold;
}
</style>
