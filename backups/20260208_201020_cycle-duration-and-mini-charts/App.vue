<script setup>
import { ref, watch, onMounted } from 'vue';
import HistoryChart from './components/HistoryChart.vue';
import FilterControls from './components/FilterControls.vue';
import CycleStatus from './components/CycleStatus.vue';
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
      <div class="avatar-placeholder"></div>
    </header>

    <CycleStatus :status="cycleStatus" />

    <section class="chart-section">
      <div class="section-header">
        <h2>Performance</h2>
      </div>
      <HistoryChart :series="chartSeries" :loading="loading" />
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

.avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00C6FF, #0072FF);
  box-shadow: 0 4px 10px rgba(0, 114, 255, 0.3);
}

.section-header {
  margin-bottom: 12px;
  padding-left: 4px;
}

.controls-section {
  margin-top: 24px;
}
</style>
