<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import HistoryChart from './HistoryChart.vue';
import { useSessionStore } from '../stores/sessionStore.js';

const props = defineProps({
  exercise: {
    type: String,
    required: true
  }
});

const sessionStore = useSessionStore();

// ---- 紀錄排 ----
// 三個 RM 各一列。這一層是「低頻」資訊：紀錄是罕見事件，平常只需要看數字。
const RM_ROWS = [
  { reps: 1, label: '1RM', rmType: 'PR' },
  { reps: 3, label: '3RM', rmType: '3RM' },
  { reps: 5, label: '5RM', rmType: '5RM' }
];

const records = computed(() => sessionStore.getExerciseRecords(props.exercise));

const recordRows = computed(() =>
  RM_ROWS
    .map(row => ({ ...row, record: records.value[row.reps] }))
    .filter(row => row.record !== null && row.record !== undefined)
);

// ---- 達成史（每列可展開）----
// 同一時間只展開一筆，理由與手風琴本身相同：Dashboard 過長是長期抱怨。
const openHistoryReps = ref(null);

function toggleHistory(reps) {
  openHistoryReps.value = openHistoryReps.value === reps ? null : reps;
}

// 達成史與折線圖讀同一份資料（該 reps 每個訓練日的最大重量），
// 不另外計算——兩者若各自算，遲早會不一致。
function historyFor(rmType) {
  return sessionStore
    .getChartSeriesForExercise(props.exercise, rmType, 'all', 'all')
    .map(([timestamp, weight]) => ({ date: isoFromTimestamp(timestamp), weight }))
    .reverse(); // getChartSeriesForExercise 由舊到新，這裡要由新到舊
}

function isoFromTimestamp(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}

// ---- 折線圖 ----
const rmSeries = computed(() =>
  RM_ROWS
    .map(row => ({
      name: row.label,
      data: sessionStore.getChartSeriesForExercise(props.exercise, row.rmType, 'all', 'all')
    }))
    // 空序列不加入圖表，圖例才不會出現一個永遠沒有線的項目。
    .filter(s => s.data.length > 0)
);

const bodyWeightSeries = computed(() => sessionStore.getChartSeriesForBodyWeight('all', 'all'));
const bodyFatSeries = computed(() => sessionStore.getChartSeriesForBodyFat('all', 'all'));

// 三個 RM 皆無資料時整張圖不顯示。體重／體脂有資料也不例外——
// 只畫體重的圖與「這個動作」無關，那是頂部 12 週圖已經回答過的問題。
const showChart = computed(() => rmSeries.value.length > 0);

const RM_COLORS = { '1RM': '#10b981', '3RM': '#0A84FF', '5RM': '#AF52DE' };

const chartSeries = computed(() => {
  const series = rmSeries.value.map(s => ({
    name: s.name,
    type: 'spline',
    color: RM_COLORS[s.name],
    data: s.data,
    yAxis: 0,
    marker: { enabled: true, radius: 3 }
  }));

  if (bodyWeightSeries.value.length > 0) {
    series.push({
      name: '體重',
      type: 'spline',
      color: '#64748b',
      data: bodyWeightSeries.value,
      yAxis: 0,
      dashStyle: 'Dot',
      marker: { enabled: false }
    });
  }

  if (bodyFatSeries.value.length > 0) {
    series.push({
      name: '體脂率',
      type: 'spline',
      color: '#fb923c',
      data: bodyFatSeries.value,
      yAxis: 1,
      dashStyle: 'ShortDash',
      marker: { enabled: false }
    });
  }

  return series;
});

// 說明文字依實際畫出來的序列組出來。
// 舊版寫死「右側虛線代表體脂率」，而當時根本沒有體脂資料——
// 描述一條不存在的線比不描述更糟。
const chartDesc = computed(() => {
  const parts = ['左軸為訓練重量 (kg)'];
  if (bodyWeightSeries.value.length > 0) parts.push('點線為體重');
  if (bodyFatSeries.value.length > 0) parts.push('右軸虛線為體脂率 (%)');
  return parts.join('，') + '。';
});

// ---- 近 14 天明細 ----
const recentDetail = computed(() => sessionStore.getExerciseRecentDetail(props.exercise));

function shortDate(iso) {
  return iso.slice(5);
}

function slashDate(iso) {
  return iso.slice(5).replace('-', '/');
}

// 45×8 ×4：後面那個數字是「同樣的重量次數做了幾組」，只有多組時才顯示。
function groupText(group) {
  const base = `${group.weight}×${group.reps}`;
  return group.count > 1 ? `${base} ×${group.count}` : base;
}

// Highcharts 若在寬度尚未確定的容器內初始化會退回預設寬度。
// 面板是展開時才建立的，掛載後強制一次 reflow 對齊實際寬度（沿用 DashboardView 既有手法）。
onMounted(() => {
  nextTick(() => window.dispatchEvent(new Event('resize')));
});
</script>

<template>
  <div class="detail-panel">
    <!-- 紀錄排 -->
    <template v-if="recordRows.length > 0">
      <div class="record-list">
        <template v-for="row in recordRows" :key="row.reps">
          <div class="record-row" @click="toggleHistory(row.reps)">
            <span class="rec-label">{{ row.label }}</span>
            <span class="rec-weight">{{ row.record.weight }}</span>
            <span class="rec-date">({{ slashDate(row.record.firstDate) }})</span>
            <span class="rec-caret" :class="{ open: openHistoryReps === row.reps }">▸</span>
          </div>
          <div v-if="openHistoryReps === row.reps" class="history-block">
            <div class="history-head">{{ row.label }} 歷史（reps = {{ row.reps }}）</div>
            <div class="history-grid">
              <div v-for="h in historyFor(row.rmType)" :key="h.date" class="history-item">
                <span class="hist-date">{{ shortDate(h.date) }}</span>
                <span class="hist-weight">{{ h.weight }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>
      <div class="panel-sep"></div>
    </template>

    <!-- 折線圖 -->
    <template v-if="showChart">
      <div class="chart-block">
        <HistoryChart :series="chartSeries" :dualAxis="true" />
        <p class="chart-desc">{{ chartDesc }}</p>
      </div>
      <div class="panel-sep"></div>
    </template>

    <!-- 近 14 天明細 -->
    <div class="recent-block">
      <div class="recent-head">近 14 天</div>

      <div v-if="recentDetail.days.length > 0" class="day-list">
        <div v-for="day in recentDetail.days" :key="day.date" class="day">
          <div class="day-line">
            <span class="day-date">{{ shortDate(day.date) }}</span>
            <span class="day-summary">{{ day.sets }}組 · 容積 {{ day.volume.toLocaleString() }}</span>
          </div>
          <div class="day-groups">
            <span v-for="(g, i) in day.groups" :key="i" class="group">{{ groupText(g) }}</span>
          </div>
        </div>
      </div>

      <div v-else class="day-list">
        <!-- 主項目的訓練頻率本來就低於 14 天，空面板等於沒有回答問題。
             「上次」不保證有代表性（可能是週期交界的輕組），因此日期一定標示出來。 -->
        <p class="not-recent">
          近 14 天未練<template v-if="recentDetail.lastBefore"> · 上次 {{ shortDate(recentDetail.lastBefore.date) }}</template>
        </p>
        <div v-if="recentDetail.lastBefore" class="day">
          <div class="day-line">
            <span class="day-date">{{ shortDate(recentDetail.lastBefore.date) }}</span>
            <span class="day-summary">{{ recentDetail.lastBefore.sets }}組 · 容積 {{ recentDetail.lastBefore.volume.toLocaleString() }}</span>
          </div>
          <div class="day-groups">
            <span v-for="(g, i) in recentDetail.lastBefore.groups" :key="i" class="group">{{ groupText(g) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 0 16px;
}

.panel-sep {
  height: 1px;
  background: var(--separator-color);
}

/* ---- 紀錄排 ---- */
.record-list {
  display: flex;
  flex-direction: column;
}

.record-row {
  display: grid;
  grid-template-columns: 44px auto 1fr 16px;
  align-items: baseline;
  gap: 8px;
  height: 30px;
  cursor: pointer;
}

.record-row:active {
  background: rgba(255, 255, 255, 0.06);
}

.rec-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.rec-weight {
  font-size: 17px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}

.rec-date {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
}

.rec-caret {
  font-size: 11px;
  color: var(--text-secondary);
  transition: transform 0.15s ease;
}

.rec-caret.open {
  transform: rotate(90deg);
}

/* ---- 達成史 ---- */
.history-block {
  padding: 6px 0 10px 44px;
}

.history-head {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px 16px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}

.hist-date {
  color: var(--text-secondary);
}

/* ---- 折線圖 ---- */
.chart-desc {
  font-size: 11px;
  color: var(--text-secondary);
  margin: 6px 0 0;
  line-height: 1.4;
}

/* ---- 近 14 天 ---- */
.recent-head {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.day-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.day-line {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.day-date {
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}

.day-summary {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
}

.day-groups {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  padding-left: 2px;
  margin-top: 2px;
}

.group {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}

.not-recent {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}
</style>
