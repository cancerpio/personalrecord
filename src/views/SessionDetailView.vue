<script setup>
</script>

<template>
  <div class="view-container">
    <div class="header-section">
      <div class="title-area">
        <label class="welcome">Detail</label>
        <h1>Session Details</h1>
      </div>
    </div>
    
    <div class="glass-card form-container">
      <h3>Editing Session</h3>
      <p style="color: var(--text-secondary); line-height: 1.5;">
        This is a dummy sub-page to demonstrate the nested routing. Notice how the `< Back` button has appeared in the Top Navbar! 
      </p>
      <p style="color: var(--text-secondary); margin-top: 16px;">
        Tap the Back button in the top left to return to the Program list without using the browser controls.
      </p>
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
</style>
