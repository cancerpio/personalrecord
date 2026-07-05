<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import HistoryChart from '../components/HistoryChart.vue';
import FilterControls from '../components/FilterControls.vue';
import SparklineRow from '../components/SparklineRow.vue';
import { useSessionStore } from '../stores/sessionStore.js';

const sessionStore = useSessionStore();

const volumeInfo = computed(() => sessionStore.weeklyTrainingVolumeInfo);

// Trailing 16-week volume series for the bar chart
const volume16 = computed(() => sessionStore.trailing16WeekVolumeInfo);
const maxWeekVolume = computed(() => Math.max(1, ...volume16.value.weeks.map(w => w.volume)));
const hoveredWeek = ref(null);
const hoveredIndex = ref(0);
const tipLeft = computed(() => {
  const n = volume16.value.weeks.length;
  return (n > 1 ? (hoveredIndex.value / (n - 1)) * 100 : 50) + '%';
});
function showWeek(w, i) { hoveredWeek.value = w; hoveredIndex.value = i; }

// Default to an empty string initially, the watcher will populate it if exercises exist
const filters = ref({
  exercise: '', 
  rmType: '3RM',
  year: new Date().getFullYear(),
  month: 'all'
});

// Computed properties reading directly from the Pinia Store
const loading = computed(() => sessionStore.isLoading);

// Get a unique list of all exercises the user has actively tracked
const uniqueExercises = computed(() => {
  const exSet = new Set(sessionStore.sessions.map(s => s.exercise));
  return Array.from(exSet).sort();
});

// Watch for changes in uniqueExercises to auto-select the first valid exercise 
// if current selection is empty or invalid
watch(uniqueExercises, (newEx) => {
  if (newEx.length > 0 && !newEx.includes(filters.value.exercise)) {
    filters.value.exercise = newEx[0];
  } else if (newEx.length === 0) {
    filters.value.exercise = '';
  }
}, { immediate: true });

// Highcharts Series array
const chartSeries = computed(() => {
  if (uniqueExercises.value.length === 0 || !filters.value.exercise) return [];

  const selectedEx = filters.value.exercise;
  
  // Primary Axis (Index 0) - Weight
  const weightData = sessionStore.getChartSeriesForExercise(selectedEx, filters.value.rmType, filters.value.year, filters.value.month);

  // Primary Axis (Index 0) - Body Weight
  const bodyWeightData = sessionStore.getChartSeriesForBodyWeight(filters.value.year, filters.value.month);
  
  // Secondary Axis (Index 1) - Body Fat 
  const bodyFatData = sessionStore.getChartSeriesForBodyFat(filters.value.year, filters.value.month);

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
      name: 'Body Weight',
      type: 'spline',
      color: '#64748b', // Slate for secondary context
      data: bodyWeightData,
      yAxis: 0,
      dashStyle: 'Dot',
      marker: { enabled: false }
    },
    {
      name: 'Body Fat %',
      type: 'spline',
      color: '#fb923c', // Orange Warn
      data: bodyFatData,
      yAxis: 1,
      dashStyle: 'ShortDash',
      marker: { enabled: false }
    }
  ]
});

// Sparklines array for the top header
const sparklines = computed(() => {
  // Force Vue reactivity to register these dependencies before mapping
  const currentRmType = filters.value.rmType;
  const currentYear = filters.value.year;
  const currentMonth = filters.value.month;
  
  // We only show up to 3 sparklines on the dashboard to keep it clean (MVP Apple HIG)
  const topExercises = uniqueExercises.value.slice(0, 3);
  
  if (topExercises.length === 0) return [];

  return topExercises.map(ex => {
    // Pass the destructured reactive values, not filters.value.*
    const data = sessionStore.getChartSeriesForExercise(ex, currentRmType, currentYear, currentMonth);
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

    <!-- Weekly Training Volume Card -->
    <div v-if="volumeInfo" class="volume-card glass-panel" :class="{ refreshing: loading }">
      <div class="volume-header">
        <div class="volume-title-group">
          <span class="volume-label">當週訓練總容積</span>
          <h2 class="volume-value">
            {{ volumeInfo.currentVolume.toLocaleString() }}
            <span class="unit">kg</span>
          </h2>
        </div>
        <div class="volume-trend" :class="volumeInfo.trend">
          <div class="trend-badge">
            <!-- UP ARROW -->
            <svg v-if="volumeInfo.trend === 'up'" class="trend-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
            <!-- DOWN ARROW -->
            <svg v-else-if="volumeInfo.trend === 'down'" class="trend-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
              <polyline points="17 18 23 18 23 12"></polyline>
            </svg>
            <!-- STABLE LINE -->
            <svg v-else-if="volumeInfo.trend === 'stable'" class="trend-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <polyline points="15 5 22 12 15 19"></polyline>
            </svg>
            <!-- NO TREND / DATA -->
            <svg v-else class="trend-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span class="trend-text">{{ volumeInfo.statusLabel }}</span>
          </div>
        </div>
      </div>

      <!-- Past 16-week volume bar chart (iPhone Health style) -->
      <div class="vol-chart-wrap">
        <div class="vol-chart">
          <div
            v-for="(w, i) in volume16.weeks"
            :key="w.monday"
            class="vol-col"
            :class="{ current: w.isCurrent }"
            @mouseenter="showWeek(w, i)"
            @mouseleave="hoveredWeek = null"
            @click="showWeek(w, i)"
          >
            <div class="vol-bar" :style="{ height: (w.volume / maxWeekVolume * 100) + '%' }"></div>
          </div>
          <div class="vol-avg-line" :style="{ bottom: (volume16.average / maxWeekVolume * 100) + '%' }"></div>
          <div class="vol-avg-tag" :style="{ bottom: (volume16.average / maxWeekVolume * 100) + '%' }">平均 {{ volume16.average.toLocaleString() }}</div>
          <div v-if="hoveredWeek" class="vol-tip" :style="{ left: tipLeft }">
            {{ hoveredWeek.rangeLabel }}<br><b>{{ hoveredWeek.volume.toLocaleString() }}</b> kg
          </div>
        </div>
        <div class="vol-xaxis">
          <span v-for="w in volume16.weeks" :key="w.monday">{{ w.monthLabel }}</span>
        </div>
      </div>

      <div class="volume-footer">
        <span class="history-average">過去 16 週平均：{{ volume16.average.toLocaleString() }} kg／週</span>
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
      <div v-if="chartSeries.length > 0" class="chart-container glass-panel">
        <HistoryChart :series="chartSeries" :dualAxis="true" />
      </div>
      <div v-else class="chart-container glass-panel empty-state">
        <div class="empty-icon">📈</div>
        <p>尚未有符合條件的訓練資料</p>
        <span class="sub-text">請至 Program 開始記錄您的第一次訓練即可看見報表</span>
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

.volume-card {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 4px;
  transition: opacity 0.3s ease;
}

.volume-card.refreshing {
  opacity: 0.6;
  pointer-events: none;
}

.volume-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.volume-title-group {
  display: flex;
  flex-direction: column;
}

.volume-label {
  font-size: 12px;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
  font-weight: 600;
}

.volume-value {
  font-size: 28px;
  font-weight: 800;
  margin: 4px 0 0 0;
  color: var(--text-primary);
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.volume-value .unit {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

.volume-trend {
  display: flex;
  align-items: center;
}

.trend-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.volume-trend.up .trend-badge {
  background: rgba(52, 199, 89, 0.15);
  color: #34c759;
}

.volume-trend.down .trend-badge {
  background: rgba(255, 59, 48, 0.15);
  color: #ff3b30;
}

.volume-trend.stable .trend-badge {
  background: rgba(255, 149, 0, 0.15);
  color: #ff9500;
}

.volume-trend.none .trend-badge {
  background: rgba(142, 142, 147, 0.15);
  color: var(--text-secondary);
}

.trend-icon {
  width: 16px;
  height: 16px;
  stroke-width: 2.5;
}

.volume-footer {
  border-top: 0.5px solid var(--separator-color);
  padding-top: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-average {
  font-size: 12px;
  color: var(--text-secondary);
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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text-secondary);
  height: 300px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 8px 0;
  color: var(--text-primary);
}

.empty-state .sub-text {
  font-size: 13px;
  opacity: 0.8;
}

.title-area h1 {
  font-size: 22px;
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.3px;
  background: linear-gradient(135deg, var(--text-primary) 0%, var(--accent-color) 100%);
  background-clip: text;
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

/* ===== Past 16-week volume bar chart ===== */
.vol-chart-wrap {
  position: relative;
  margin-top: 2px;
}

.vol-chart {
  position: relative;
  height: 120px;
  display: flex;
  align-items: flex-end;
  gap: 3px;
  border-bottom: 1px solid var(--separator-color);
}

.vol-col {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: flex-end;
  cursor: pointer;
}

.vol-bar {
  width: 100%;
  min-height: 2px;
  border-radius: 4px 4px 2px 2px;
  background: rgba(0, 122, 255, 0.4);
  transition: background 0.15s ease;
}

.vol-col.current .vol-bar,
.vol-col:hover .vol-bar {
  background: var(--accent-color);
}

.vol-avg-line {
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1.5px dashed var(--text-secondary);
  opacity: 0.55;
  pointer-events: none;
}

.vol-avg-tag {
  position: absolute;
  right: 0;
  transform: translateY(-50%);
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--card-bg-blur);
  padding: 0 4px;
  border-radius: 6px;
  pointer-events: none;
}

.vol-tip {
  position: absolute;
  top: -6px;
  transform: translate(-50%, -100%);
  background: rgba(30, 30, 32, 0.95);
  color: #ffffff;
  padding: 5px 8px;
  border-radius: 8px;
  font-size: 11px;
  line-height: 1.35;
  white-space: nowrap;
  text-align: center;
  pointer-events: none;
  z-index: 5;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
}

.vol-tip b {
  font-variant-numeric: tabular-nums;
}

.vol-xaxis {
  display: flex;
  padding: 6px 1px 0;
  font-size: 10px;
  color: var(--text-secondary);
  font-weight: 500;
}

.vol-xaxis span {
  flex: 1;
  text-align: center;
}
</style>
