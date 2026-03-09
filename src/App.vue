<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import TopNavbar from './components/TopNavbar.vue';

const route = useRoute();
const router = useRouter();

const currentPath = computed(() => {
  return route.path;
});

// Tab Navigation Items
const tabs = [
  { path: '/dashboard', label: 'Charts', icon: 'chart' },
  { path: '/program', label: 'Program', icon: 'list' },
  { path: '/log', label: 'Log', icon: 'pen' }
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
          <svg v-if="tab.icon === 'pen'" viewBox="0 0 24 24" fill="none" class="nav-icon" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
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
  border-top: 0.5px solid rgba(255, 255, 255, 0.15); /* Thinner border */
  box-sizing: content-box; /* Ensure padding doesn't affect height calculation */
}

.glass-nav {
  background: rgba(22, 22, 30, 0.85); /* Darker, premium feel */
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
  color: #8E8E93; /* iOS inactive gray */
  transition: color 0.2s ease;
}

.nav-item.active {
  color: #a5b4fc; /* Accent color */
}

.nav-item.active .nav-icon {
  stroke-width: 2.5;
  filter: drop-shadow(0 0 6px rgba(165, 180, 252, 0.3));
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
