<script setup>
import { ref, watch, onMounted } from 'vue';
import HistoryChart from './components/HistoryChart.vue';
import FilterControls from './components/FilterControls.vue';
import CycleStatus from './components/CycleStatus.vue';
import SparklineRow from './components/SparklineRow.vue';
import { fetchChartData } from './mock/data';

// State
const loading = ref(true);
const chartSeries = ref([]);
const relativeStrengthSeries = ref([]);
const sparklines = ref([]);
const cycleWeeks = ref(1);

const filters = ref({
  exercise: 'all', 
  rmType: '3RM',
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1
});

const loadChartData = async (currentFilters) => {
  loading.value = true;
  try {
    const { series, relativeSeries, sparklines: sl, cycleWeeks: cw } = await fetchChartData(currentFilters);
    chartSeries.value = series;
    relativeStrengthSeries.value = relativeSeries;
    sparklines.value = sl;
    cycleWeeks.value = cw;
  } catch (error) {
    console.error('Failed to load chart data:', error);
  } finally {
    loading.value = false;
  }
};

watch(filters, (newVal) => {
  loadChartData(newVal);
}, { deep: true });

onMounted(() => {
  loadChartData(filters.value);
});
</script>

<template>
  <div class="line-mini-app safe-area">
    <div class="content-wrapper">
      <!-- Header -->
      <div class="header-section">
        <div class="title-area">
          <label class="welcome">Welcome Back</label>
          <h1>Training Log</h1>
        </div>
      </div>

      <!-- Cycle Status -->
      <CycleStatus :status="'Linear'" :weeks="cycleWeeks" />

      <!-- Sparklines (Performance Trends) -->
      <div class="sparklines-container" :class="{ refreshing: loading }">
        <SparklineRow 
          v-for="item in sparklines" 
          :key="item.id" 
          :data="item" 
        />
      </div>

      <!-- Chart Section 1: Absolute Strength & Bodyweight -->
      <div class="chart-section" :class="{ loading: loading }">
        <div class="section-header">
          <h2>Performance Overview</h2>
          <p class="section-desc">動作重量 vs 體重趨勢：觀察體重變化對力量表現的影響。</p>
        </div>
        <div class="chart-container glass-panel">
          <HistoryChart :series="chartSeries" :dualAxis="true" />
        </div>
      </div>

      <!-- Chart Section 2: Relative Strength -->
      <div class="chart-section" :class="{ loading: loading }">
        <div class="section-header">
          <h2>Relative Strength</h2>
          <p class="section-desc">相對強度 (倍率)：排除體重因素後的真實肌力水準 (動作重量 / Base Weight)。</p>
        </div>
        <div class="chart-container glass-panel">
          <HistoryChart :series="relativeStrengthSeries" :dualAxis="false" yAxisLabel="Ratio" />
        </div>
      </div>

      <!-- Filters -->
      <FilterControls v-model:filters="filters" />
    </div>
  </div>
</template>

<style scoped>
.line-mini-app {
  min-height: 100vh;
  background: var(--bg-gradient);
  color: var(--text-primary);
  font-family: var(--font-primary);
  padding: 20px;
  overflow-y: auto;
  padding-bottom: 120px; /* Space for fixed bottom filter */
}

.safe-area {
  padding-top: max(20px, env(safe-area-inset-top));
  padding-bottom: max(120px, env(safe-area-inset-bottom));
}

.content-wrapper {
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.header-section {
  padding: 0 4px;
}

.sparklines-container {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: opacity 0.3s ease;
}

.sparklines-container.refreshing {
  opacity: 0.6;
  pointer-events: none;
}

.chart-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: opacity 0.3s ease;
}

.chart-section.loading {
  opacity: 0.5;
  pointer-events: none;
}

.section-header h2 {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 4px 0;
  color: var(--text-primary);
}

.section-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

.chart-container {
  padding: 16px;
  border-radius: 20px;
  min-height: 300px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
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
</style>
