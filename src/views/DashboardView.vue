<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import HistoryChart from '../components/HistoryChart.vue';
import FilterControls from '../components/FilterControls.vue';
import SparklineRow from '../components/SparklineRow.vue';
import { useSessionStore } from '../stores/sessionStore.js';

const sessionStore = useSessionStore();

const filters = ref({
  exercise: 'all', 
  rmType: '3RM',
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1
});

// Computed properties reading directly from the Pinia Store
const loading = computed(() => sessionStore.isLoading);

// Get a unique list of all exercises the user has actively tracked
const uniqueExercises = computed(() => {
  const exSet = new Set(sessionStore.sessions.map(s => s.exercise));
  return Array.from(exSet).sort();
});

// Highcharts Series array
const chartSeries = computed(() => {
  // If "all" (default) is selected, fallback to the first exercise they've tracked
  const firstAvailable = uniqueExercises.value.length > 0 ? uniqueExercises.value[0] : 'Squat';
  const selectedEx = filters.value.exercise === 'all' ? firstAvailable : filters.value.exercise;
  
  // Primary Axis (Index 0) - Weight
  const weightData = sessionStore.getChartSeriesForExercise(selectedEx);
  
  // Secondary Axis (Index 1) - Body Fat (Mock placeholder for MVP, could use another store later)
  // Generating a flat mock line matching the datetimes of the real weightData if it exists
  const bodyFatData = weightData.map(point => {
    // Drop by 0.1% per day roughly
    const offset = Math.random() * 0.5 - 0.25; 
    return [point[0], 15.5 + offset];
  });

  return [
    {
      name: `${selectedEx} (${filters.value.rmType})`,
      type: 'spline',
      color: '#10b981', // Emerald Primary
      data: weightData,
      yAxis: 0,
      marker: { enabled: true, radius: 4 }
    },
    {
      name: 'Body Fat %',
      type: 'spline',
      color: '#fb923c', // Orange Warn
      data: bodyFatData.length > 0 ? bodyFatData : [[Date.now(), 15.5]],
      yAxis: 1,
      dashStyle: 'ShortDash',
      marker: { enabled: false }
    }
  ]
});

// Sparklines array for the top header
const sparklines = computed(() => {
  // We only show up to 3 sparklines on the dashboard to keep it clean (MVP Apple HIG)
  const topExercises = uniqueExercises.value.slice(0, 3);
  
  if (topExercises.length === 0) return [];

  return topExercises.map(ex => {
    const data = sessionStore.getChartSeriesForExercise(ex);
    const yValues = data.map(d => d[1]);
    
    // Default values for short data
    let trend = 'none';
    let label = '—';
    
    if (yValues.length >= 2) {
      // Determine the current trend direction based on the last two points
      const lastPoint = yValues[yValues.length - 1];
      const prevPoint = yValues[yValues.length - 2];
      
      let currentTrendDirection = 'same';
      if (lastPoint > prevPoint) currentTrendDirection = 'up';
      if (lastPoint < prevPoint) currentTrendDirection = 'down';

      // Count consecutive days of this trend
      let streakCount = 1; // Including the last point
      for (let i = yValues.length - 2; i >= 0; i--) {
        const p1 = yValues[i + 1];
        const p0 = yValues[i];
        
        let pointTrend = 'same';
        if (p1 > p0) pointTrend = 'up';
        if (p1 < p0) pointTrend = 'down';

        if (pointTrend === currentTrendDirection) {
          streakCount++;
        } else {
          break; // Streak broken
        }
      }

      trend = currentTrendDirection;
      
      if (trend === 'up') {
        label = `連續 ${streakCount} 天上升`;
      } else if (trend === 'down') {
        label = `連續 ${streakCount} 天下降`;
      } else {
        label = `連續 ${streakCount} 天停滯`;
      }
    }

    return {
      id: ex.toLowerCase().replace(' ', '-'),
      label: ex,
      value: yValues.length > 0 ? `${yValues[yValues.length - 1]}kg` : '—',
      trend: trend,
      statusLabel: label,
      data: yValues
    };
  });
});

onMounted(() => {
  if (sessionStore.sessions.length === 0) {
    sessionStore.fetchSessions();
  }
});
</script>

<template>
  <div class="dashboard-view">
    <!-- Header -->
    <div class="header-section">
      <div class="title-area">
        <label class="welcome">Welcome Back</label>
        <h1>Strength and Conditioning Analytics</h1>
      </div>
    </div>

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
        <p class="section-desc">左軸代表訓練重量 (KG)，右側虛線代表體脂率 (%)，協助分析體態變化對力量的影響。</p>
      </div>
      <div class="chart-container glass-panel">
        <HistoryChart :series="chartSeries" :dualAxis="true" />
      </div>
    </div>

    <!-- Filters -->
    <FilterControls v-model:filters="filters" :availableExercises="uniqueExercises" />
  </div>
</template>

<style scoped>
.dashboard-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-bottom: 20px; /* Space above nav bar */
  min-height: 100%; /* Ensure content fills available space */
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
