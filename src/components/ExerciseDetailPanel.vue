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

// Easy Max 只掛在 1RM 那一列——它就是 1RM 的 90%，掛在別列沒有意義。
// 沒有 1RM 時為 null，該處留白而不是顯示佔位符。
const easyMax = computed(() => sessionStore.getEasyMax(props.exercise));

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
// 線是「這個動作實際做過的次數」，不是 1RM/3RM/5RM。
// 上面那排是紀錄（罕見事件、不會往下），這張圖是趨勢（練輕就往下），兩層不同的問題。
const MAX_SCHEMES = 3;
const repTrends = computed(() => sessionStore.getExerciseRepTrends(props.exercise, MAX_SCHEMES));

// 完全沒有有效紀錄時整張圖不顯示（總覽表只列有紀錄的動作，正常流程下不可達）。
const showChart = computed(() => repTrends.value.schemes.length > 0);

// 依顯示順序取色（次數由少到多）。做 1/3/5 的動作因此維持原本的綠／藍／紫。
const TREND_COLORS = ['#10b981', '#0A84FF', '#AF52DE'];

// 這張圖只回答訓練表現。體重與體脂率已移除（2026-09-06）：
// 體組成集中在 Dashboard 頂部的 12 週圖，同一件事不在兩個地方各畫一次。
const chartSeries = computed(() =>
  repTrends.value.schemes.map((scheme, i) => ({
    name: `${scheme.reps} 下`,
    type: 'spline',
    color: TREND_COLORS[i % TREND_COLORS.length],
    data: scheme.data,
    yAxis: 0,
    marker: { enabled: true, radius: 3 }
  }))
);

// 只在「真的有次數沒被畫出來」時才解釋挑選規則。
// 沒篩掉任何東西卻描述一條篩選規則，只是佔版面。
const chartNote = computed(() => {
  const { schemes, hiddenCount } = repTrends.value;
  return hiddenCount > 0
    ? `只顯示最常練的 ${schemes.length} 種次數 · 每點為當日最大重量`
    : '每點為當日最大重量';
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
            <span class="rec-easy">
              <template v-if="row.reps === 1 && easyMax !== null">Easy Max {{ easyMax }}</template>
            </span>
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
        <HistoryChart :series="chartSeries" :dualAxis="false" />
        <p class="chart-note">{{ chartNote }}</p>
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
  grid-template-columns: 44px auto auto 1fr 16px;
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

.rec-easy {
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
.chart-note {
  font-size: 11px;
  color: var(--text-secondary);
  margin: 4px 0 0;
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
