<script setup>
</script>

<template>
  <div class="view-container">
    <div class="header-section">
      <div class="title-area">
        <label class="welcome">History</label>
        <h1>Training Logs</h1>
      </div>
    </div>
    <div class="placeholder-content glass-card">
      <p>Your past training sessions will be displayed here.</p>
      <p class="coming-soon">Coming Soon...</p>
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

.placeholder-content {
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  text-align: center;
  color: var(--text-secondary);
}

.coming-soon {
  margin-top: 16px;
  font-size: 14px;
  opacity: 0.6;
}
</style>
