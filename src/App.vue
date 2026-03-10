<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import TopNavbar from './components/TopNavbar.vue';

const route = useRoute();
const router = useRouter();

const currentPath = computed(() => {
  return route.path;
});

// Apply theme on load
const applyTheme = () => {
  try {
    const saved = localStorage.getItem('PR_SETTINGS');
    if (saved) {
      const settings = JSON.parse(saved);
      if (settings.themeMode && settings.themeMode !== 'auto') {
        document.documentElement.setAttribute('data-theme', settings.themeMode);
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    }
  } catch (e) {
    console.error('Failed to parse settings', e);
  }
};

applyTheme();

// Listen to local storage changes to sync theme across tabs/updates inside settings
window.addEventListener('storage', (e) => {
  if (e.key === 'PR_SETTINGS') applyTheme();
});

// Tab Navigation Items
const tabs = [
  { path: '/dashboard', label: 'Dashboard', icon: 'chart' },
  { path: '/record', label: 'Record', icon: 'list' },
  { path: '/settings', label: 'Settings', icon: 'settings' }
];

const navigateTo = (path) => {
  router.push(path);
};
</script>

<template>
  <div class="line-mini-app safe-area">
    <TopNavbar />
    
    <div class="content-wrapper">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>

    <!-- Bottom Navigation Bar -->
    <nav class="bottom-nav glass-nav">
      <button 
        v-for="tab in tabs" 
        :key="tab.path"
        class="nav-item"
        :class="{ active: currentPath === tab.path }"
        @click="navigateTo(tab.path)"
      >
        <div class="icon-box">
          <!-- Inline SVGs for Icons -->
          <svg v-if="tab.icon === 'chart'" viewBox="0 0 24 24" fill="none" class="nav-icon" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
          <svg v-if="tab.icon === 'list'" viewBox="0 0 24 24" fill="none" class="nav-icon" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
          <svg v-if="tab.icon === 'settings'" viewBox="0 0 24 24" fill="none" class="nav-icon" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        </div>
        <span class="nav-label">{{ tab.label }}</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.line-mini-app {
  min-height: 100vh;
  background: var(--bg-gradient);
  color: var(--text-primary);
  font-family: var(--font-primary);
  padding: 0;
  overflow-y: hidden; /* Scroll handled by content-wrapper or view */
  position: relative;
}

.safe-area {
  padding-top: max(20px, env(safe-area-inset-top));
  padding-bottom: max(20px, env(safe-area-inset-bottom));
}

.content-wrapper {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  padding-top: calc(54px + 20px + env(safe-area-inset-top)); /* Make room for absolute Top Navbar */
  padding-bottom: 90px; /* Adjusted space for bottom nav */
  height: 100vh;
  box-sizing: border-box;
  overflow-y: auto; /* Scrollable content area */
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

/* Hide scrollbar for Chrome, Safari and Opera */
.content-wrapper::-webkit-scrollbar {
  display: none;
}

/* Bottom Navigation */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 54px; /* Native-like height (excluding safe area) */
  padding-bottom: env(safe-area-inset-bottom);
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 100;
  border-top: 0.5px solid var(--glass-border);
  box-sizing: content-box; /* Ensure padding doesn't affect height calculation */
}

.glass-nav {
  background: var(--card-bg-blur);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.nav-item {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  gap: 3px; /* Tighter gap */
  padding: 4px 0;
  cursor: pointer;
  color: var(--text-secondary);
  transition: color 0.2s ease;
}

.nav-item.active {
  color: var(--accent-color);
}

.nav-item.active .nav-icon {
  stroke-width: 2.5;
  filter: drop-shadow(0 0 6px var(--accent-color));
  opacity: 0.6;
}

.icon-box {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon {
  width: 24px;
  height: 24px;
  stroke-width: 2;
}

.nav-label {
  font-size: 10px; /* Smaller, native size */
  font-weight: 500;
  letter-spacing: 0.1px;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
