<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

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
const searchQuery = ref(props.modelValue);
const customOptions = ref([]);
const dropdownRef = ref(null);

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
    if (searchQuery.value !== props.modelValue) {
        searchQuery.value = props.modelValue;
    }
  }
};

const allOptions = computed(() => {
  // Combine custom options (first) and base options
  const combined = [...customOptions.value, ...props.options];
  // Remove duplicates just in case
  return [...new Set(combined)];
});

const filteredOptions = computed(() => {
  if (!searchQuery.value) return allOptions.value;
  const lowerQuery = String(searchQuery.value).toLowerCase();
  return allOptions.value.filter(opt => 
    opt && String(opt).toLowerCase().includes(lowerQuery)
  );
});

const canAdd = computed(() => {
  if (!searchQuery.value) return false;
  const q = String(searchQuery.value).trim();
  if (q === '') return false;
  
  const lowerQuery = q.toLowerCase();
  const exactMatchExists = allOptions.value.some(opt => opt && String(opt).toLowerCase() === lowerQuery);
  return !exactMatchExists;
});

const toggleDropdown = () => {
  isOpen.value = true;
  searchQuery.value = ''; // clear input so user can see all options when opening
};

const selectOption = (option) => {
  searchQuery.value = option;
  emit('update:modelValue', option);
  isOpen.value = false;
};

const addNewOption = () => {
  if (!searchQuery.value) return;
  const newOption = String(searchQuery.value).trim();
  if (!newOption) return;
  
  // Format: Capitalize first letter of each word (Title Case)
  const formattedOption = newOption.replace(/\b\w/g, l => l.toUpperCase());

  if (!allOptions.value.includes(formattedOption)) {
    customOptions.value.unshift(formattedOption); // Add to top of custom list
    localStorage.setItem('PR_CUSTOM_EXERCISES', JSON.stringify(customOptions.value));
  }
  
  selectOption(formattedOption);
};
</script>

<template>
  <div class="searchable-dropdown" ref="dropdownRef">
    <div class="input-wrapper">
      <input 
        type="text" 
        class="glass-input dropdown-input"
        v-model="searchQuery"
        :placeholder="isOpen ? 'Search...' : (modelValue || placeholder)"
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
          @click="selectOption(option)"
        >
          {{ option }}
          <span v-if="customOptions.includes(option)" class="custom-badge">Custom</span>
        </li>
      </ul>
      
      <!-- Empty state if no matches -->
      <div v-else class="empty-state">
        No matches found.
      </div>

      <!-- Add New Button -->
      <!-- Only show Add button if there is input AND it doesn't match an existing item perfectly -->
      <div v-if="canAdd" class="add-new-action">
        <button class="add-btn" @click.prevent="addNewOption">
          <span class="plus-icon">+</span> Add "{{ String(searchQuery).trim() }}"
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
  font-size: 16px;
  cursor: text;
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
  overflow-y: auto;
  z-index: 100;
  padding: 8px 0;
  display: flex;
  flex-direction: column;
}

.options-list {
  list-style: none;
  padding: 0;
  margin: 0;
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
  color: #8E8E93;
  font-size: 14px;
  text-align: center;
}

.add-new-action {
  padding: 8px 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  margin-top: 4px;
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

.plus-icon {
  font-size: 16px;
  font-weight: bold;
}
</style>
