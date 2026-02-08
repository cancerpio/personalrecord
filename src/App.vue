<script setup>
import { ref, watch, onMounted } from 'vue';
import HistoryChart from './components/HistoryChart.vue';
import FilterControls from './components/FilterControls.vue';
import CycleStatus from './components/CycleStatus.vue';
import SparklineRow from './components/SparklineRow.vue';
import { fetchChartData } from './mock/data';

// Default Filters
const filters = ref({
  rmType: '3RM',
  exercise: 'all',
  year: 2026,
  month: 2
});

// State
const chartSeries = ref([]);
const cycleStatus = ref('Linear');
const cycleWeeks = ref(1);
const sparklines = ref([]);
const loading = ref(false);

const loadData = async () => {
  loading.value = true;
  try {
    const data = await fetchChartData({
      year: filters.value.year,
      month: filters.value.month,
      exercise: filters.value.exercise,
      rmType: filters.value.rmType
    });
    
    chartSeries.value = data.series;
    cycleStatus.value = data.cycle;
    cycleWeeks.value = data.cycleWeeks;
    sparklines.value = data.sparklines;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

// Initial Load
onMounted(() => {
  loadData();
});

// Watch filters to reload data
watch(filters, () => {
  loadData();
}, { deep: true });

</script>

<template>
  <main class="container">
    <header class="header">
      <div class="title-area">
        <label class="welcome">Welcome Back</label>
        <h1>Training Log</h1>
      </div>
    </header>

    <CycleStatus :status="cycleStatus" :weeks="cycleWeeks" />

    <section class="chart-section">
      <div class="section-header">
        <h2>Performance</h2>
      </div>
      <HistoryChart :series="chartSeries" :loading="loading" />
      
      <div class="sparklines-container" :class="{ refreshing: loading }">
        <SparklineRow 
          v-for="item in sparklines" 
          :key="item.id" 
          :data="item" 
        />
      </div>
    </section>

    <section class="controls-section">
      <FilterControls v-model:filters="filters" />
    </section>
  </main>
</template>

<style scoped>
.container {
  max-width: 600px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.welcome {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 4px;
}



.section-header {
  margin-bottom: 12px;
  padding-left: 4px;
}

.controls-section {
  margin-top: 24px;
}

.sparklines-container {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: opacity 0.3s ease;
}

.sparklines-container.refreshing {
  opacity: 0.6;
  pointer-events: none;
}
</style>
