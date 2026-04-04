<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const canGoBack = computed(() => {
  // Only show TopNavbar with Back button on deep sub-pages.
  // Root tab pages (Dashboard, Record, Settings) must NOT show it.
  const rootPaths = ['/', '/dashboard', '/record', '/settings'];
  return !rootPaths.includes(route.path);
});

const pageTitle = computed(() => {
  return route.meta.title || 'Personal Record';
});

const goBack = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    // Fallback if the user refreshed a sub-page directly and has no browser history
    router.push('/dashboard');
  }
};
</script>

<template>
  <header v-if="canGoBack" class="top-navbar glass-nav">
    <div class="nav-container">
      <div class="left-section">
        <button @click="goBack" class="back-btn">
          <svg viewBox="0 0 24 24" fill="none" class="back-icon" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          <span>Back</span>
        </button>
      </div>
      
      <div class="center-section">
        <h2 class="nav-title">{{ pageTitle }}</h2>
      </div>
      
      <div class="right-section">
        <!-- Future area for settings/profile icon -->
      </div>
    </div>
  </header>
</template>

<style scoped>
.top-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 54px;
  padding-top: env(safe-area-inset-top);
  z-index: 100;
  box-sizing: content-box;
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.1);
}

.glass-nav {
  background: rgba(22, 22, 30, 0.85); /* Consistent with Bottom Navbar */
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.nav-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 16px;
}

.left-section, .right-section {
  flex: 1;
  display: flex;
  align-items: center;
}

.right-section {
  justify-content: flex-end;
}

.center-section {
  flex: 2;
  display: flex;
  justify-content: center;
  align-items: center;
}

.nav-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  color: #a5b4fc; /* Accent color mimicking iOS blue */
  font-size: 16px;
  font-weight: 500;
  padding: 8px 0;
  cursor: pointer;
  transition: opacity 0.2s;
}

.back-btn:active {
  opacity: 0.6;
}

.back-icon {
  width: 20px;
  height: 20px;
}
</style>
