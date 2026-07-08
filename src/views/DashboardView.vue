<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import HistoryChart from '../components/HistoryChart.vue';
import FilterControls from '../components/FilterControls.vue';
import SparklineRow from '../components/SparklineRow.vue';
import { useSessionStore } from '../stores/sessionStore.js';

const sessionStore = useSessionStore();

const volumeInfo = computed(() => sessionStore.weeklyTrainingVolumeInfo);

// Trailing 16-week volume series for the bar chart
const volume16 = computed(() => sessionStore.trailing16WeekVolumeInfo);
const hasAnyBodyWeight = computed(() => volume16.value.weeks.some(w => w.avgBodyWeight != null));

// ---- 標頭雙欄摘要 ----
const headerVolume = computed(() => volumeInfo.value.currentVolume.toLocaleString());
const volTrendLabel = computed(() => {
  const info = volumeInfo.value;
  if ((info.trend === 'up' || info.trend === 'down') && info.trendPct != null) {
    return `${info.statusLabel} ${Math.abs(info.trendPct)}%`;
  }
  return info.statusLabel;
});
const headerBodyWeight = computed(() =>
  volumeInfo.value.currentBodyWeight != null ? volumeInfo.value.currentBodyWeight.toFixed(1) : null
);
const bwTrendLabel = computed(() => {
  const info = volumeInfo.value;
  if (info.bodyWeightTrend === 'none' || info.bodyWeightDelta == null) return '—';
  return `${Math.abs(info.bodyWeightDelta).toFixed(1)} kg`;
});

// ---- 主題偵測（供 Highcharts 顏色使用；CSS 變數無法套用在 SVG fill 屬性上）----
const isDark = ref(false);
function detectDark() {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark') return true;
  if (attr === 'light') return false;
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}
let mql = null;
let themeObserver = null;
const onSchemeChange = () => { isDark.value = detectDark(); };
onMounted(() => {
  isDark.value = detectDark();
  mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener('change', onSchemeChange);
  themeObserver = new MutationObserver(onSchemeChange);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  // Highcharts 在初次量測若容器寬度未定會退回預設 600px；強制一次 reflow 對齊實際寬度
  nextTick(() => window.dispatchEvent(new Event('resize')));
});
onUnmounted(() => {
  if (mql) mql.removeEventListener('change', onSchemeChange);
  if (themeObserver) themeObserver.disconnect();
});

// ---- 16 週容積 + 每週平均體重 combo 圖 ----
const volumeChartOptions = computed(() => {
  const weeks = volume16.value.weeks;
  const dark = isDark.value;
  const blue = dark ? '#0A84FF' : '#007AFF';
  const blueSoft = dark ? 'rgba(10,132,255,0.38)' : 'rgba(0,122,255,0.32)';
  const orange = dark ? '#FF9F0A' : '#D97706';
  const ghostFill = dark ? 'rgba(10,132,255,0.14)' : 'rgba(0,122,255,0.10)';
  const muted = dark ? '#98989E' : '#8E8E93';
  const avg = volume16.value.average;

  const volumeData = weeks.map(w => {
    if (w.isCurrent) {
      // 當週為部分加總 → ghost 樣式 + 「進行中」標示，避免被誤讀為驟降
      return {
        y: w.volume,
        color: ghostFill,
        borderColor: blue,
        borderWidth: 1.5,
        dashStyle: 'Dash',
        dataLabels: {
          enabled: true,
          format: '進行中',
          y: -2,
          style: { color: blue, fontSize: '10px', fontWeight: '700', textOutline: 'none' }
        }
      };
    }
    return { y: w.volume, color: blueSoft };
  });
  const bwData = weeks.map(w => (w.avgBodyWeight != null ? Number(w.avgBodyWeight.toFixed(1)) : null));

  // 右軸範圍策略：最小跨度 8kg（防雜訊放大）、最大跨度 50kg（防離群值撐爆）
  const bwVals = weeks.map(w => w.avgBodyWeight).filter(v => v != null);
  let bwAxisMin, bwAxisMax;
  if (bwVals.length) {
    let lo = Math.min(...bwVals) - 0.5;
    let hi = Math.max(...bwVals) + 0.5;
    const span = hi - lo;
    const MIN_SPAN = 8, MAX_SPAN = 50;
    const mid = (lo + hi) / 2;
    if (span < MIN_SPAN) { lo = mid - MIN_SPAN / 2; hi = mid + MIN_SPAN / 2; }
    else if (span > MAX_SPAN) { lo = mid - MAX_SPAN / 2; hi = mid + MAX_SPAN / 2; }
    bwAxisMin = lo;
    bwAxisMax = hi;
  }

  return {
    chart: {
      backgroundColor: 'transparent',
      height: 210,
      spacing: [18, 6, 4, 6],
      style: { fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif' }
    },
    title: { text: null },
    credits: { enabled: false },
    xAxis: {
      categories: weeks.map(w => w.monthLabel),
      lineColor: 'var(--glass-border)',
      tickWidth: 0,
      labels: { style: { color: 'var(--text-secondary)', fontSize: '10px' } }
    },
    yAxis: [
      {
        title: { text: null },
        min: 0,
        gridLineColor: 'var(--glass-border)',
        labels: { enabled: false },
        plotLines: [{
          value: avg,
          color: muted,
          dashStyle: 'Dash',
          width: 1.5,
          zIndex: 3,
          label: {
            text: `平均 ${avg.toLocaleString()}`,
            align: 'right',
            y: -4,
            style: { color: muted, fontSize: '10px', fontWeight: '600' }
          }
        }]
      },
      {
        title: { text: null },
        opposite: true,
        gridLineWidth: 0,
        min: bwAxisMin,
        max: bwAxisMax,
        labels: { style: { color: orange, fontSize: '10px', fontWeight: '600' }, format: '{value:.0f}' }
      }
    ],
    legend: {
      enabled: true,
      itemStyle: { color: 'var(--text-secondary)', fontWeight: 'normal', fontSize: '11px' },
      symbolRadius: 2
    },
    tooltip: {
      useHTML: true,
      shared: true,
      backgroundColor: dark ? 'rgba(240,240,245,0.97)' : 'rgba(28,28,30,0.96)',
      style: { color: dark ? '#1c1c1e' : '#ffffff', fontSize: '12px' },
      borderWidth: 0,
      borderRadius: 10,
      shadow: true,
      formatter() {
        const i = (this.points && this.points.length) ? this.points[0].point.index : this.point.index;
        const w = weeks[i];
        if (!w) return '';
        const bwLine = w.avgBodyWeight != null
          ? `體重：<b>${w.avgBodyWeight.toFixed(1)}</b> kg`
          : '體重：無紀錄';
        return `<div style="font-size:11px;opacity:.7;margin-bottom:2px">${w.rangeLabel}${w.isCurrent ? ' · 本週進行中' : ''}</div>`
          + `容積：<b>${w.volume.toLocaleString()}</b> kg<br/>${bwLine}`;
      }
    },
    plotOptions: {
      column: { borderRadius: 4, pointPadding: 0.08, groupPadding: 0.06, borderWidth: 0 },
      line: {
        connectNulls: false,
        lineWidth: 2.5,
        color: orange,
        marker: { enabled: true, radius: 3.5, symbol: 'circle' },
        zIndex: 4
      }
    },
    series: [
      { name: '週容積', type: 'column', yAxis: 0, data: volumeData, color: blueSoft },
      { name: '週平均體重', type: 'line', yAxis: 1, data: bwData }
    ]
  };
});

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
      <!-- 標頭：左右兩欄（容積 | 平均體重） -->
      <div class="stats">
        <div class="stat-pair">
          <!-- 訓練容積 -->
          <div class="stat-cell">
            <div class="head-label"><span class="swatch vol"></span>當週訓練總容積</div>
            <h2 class="head-value">{{ headerVolume }}<span class="unit">kg</span></h2>
            <div class="chip" :class="volumeInfo.trend">
              <svg v-if="volumeInfo.trend === 'up'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
              <svg v-else-if="volumeInfo.trend === 'down'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>{{ volTrendLabel }}</span>
            </div>
          </div>
          <!-- 平均體重 -->
          <div class="stat-cell">
            <div class="head-label"><span class="swatch bw"></span>當週平均體重</div>
            <h2 v-if="headerBodyWeight != null" class="head-value">{{ headerBodyWeight }}<span class="unit">kg</span></h2>
            <h2 v-else class="head-value muted">尚無體重紀錄</h2>
            <div class="chip neutral" :class="volumeInfo.bodyWeightTrend">
              <svg v-if="volumeInfo.bodyWeightTrend === 'up'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
              <svg v-else-if="volumeInfo.bodyWeightTrend === 'down'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>{{ bwTrendLabel }}</span>
            </div>
          </div>
        </div>
        <div class="basis-note">趨勢基準：上一完整週 vs 前期各週平均</div>
      </div>

      <!-- 過去 16 週容積長條 + 每週平均體重折線（Highcharts combo） -->
      <div class="vol-chart-wrap">
        <highcharts class="vol-hc" :options="volumeChartOptions"></highcharts>
        <p v-if="!hasAnyBodyWeight" class="bw-empty">記錄體重即可與訓練量對照</p>
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
  min-width: 0;
  transition: opacity 0.3s ease;
}

.volume-card.refreshing {
  opacity: 0.6;
  pointer-events: none;
}

/* ===== 標頭雙欄摘要 ===== */
.stats {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.stat-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.stat-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-right: 12px;
  min-width: 0;
}

.stat-cell + .stat-cell {
  padding-left: 12px;
  padding-right: 0;
  align-items: flex-end;
  text-align: right;
}

.stat-cell + .stat-cell .chip {
  align-self: flex-end;
}

.head-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.4px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.head-label .swatch {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex: none;
}

.head-label .swatch.vol { background: var(--accent-color); }
.head-label .swatch.bw { background: #d97706; }

.head-value {
  font-size: 27px;
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.5px;
  color: var(--text-primary);
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.head-value.muted {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-secondary);
}

.head-value .unit {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.chip {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.chip svg { width: 13px; height: 13px; }

/* 容積 chip：好壞語意色 */
.chip.up { background: rgba(52, 199, 89, 0.15); color: #34c759; }
.chip.down { background: rgba(255, 59, 48, 0.15); color: #ff3b30; }
.chip.stable { background: rgba(255, 149, 0, 0.15); color: #ff9500; }
.chip.none { background: rgba(142, 142, 147, 0.15); color: var(--text-secondary); }

/* 體重 chip：一律中性灰（升降無好壞之分），覆蓋上面的語意色 */
.chip.neutral,
.chip.neutral.up,
.chip.neutral.down,
.chip.neutral.stable,
.chip.neutral.none {
  background: rgba(142, 142, 147, 0.16);
  color: var(--text-secondary);
}

.basis-note {
  font-size: 10.5px;
  color: var(--text-secondary);
  opacity: 0.75;
  line-height: 1.4;
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

/* ===== 16 週容積 + 體重 combo 圖 ===== */
.vol-chart-wrap {
  position: relative;
  margin-top: 2px;
  width: 100%;
  min-width: 0;
  overflow: hidden;
}

.vol-hc {
  width: 100%;
  min-width: 0;
  display: block;
}

.bw-empty {
  position: absolute;
  left: 50%;
  bottom: 34px;
  transform: translateX(-50%);
  margin: 0;
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.7;
  pointer-events: none;
  white-space: nowrap;
}
</style>
