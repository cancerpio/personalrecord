<script setup>
defineProps({
  rows: {
    type: Array,
    default: () => []
  },
  // 目前展開中的動作名稱，null 代表全部收合。
  expandedExercise: {
    type: String,
    default: null
  }
});

// 點一列＝發出「切換該動作」的訊號。本元件維持純表現層：
// 展開狀態由容器持有，展開的內容也由容器透過 panel slot 放進來——
// 這裡不知道詳細面板是什麼，也不碰 store。
//
// 舊行為是「捲到頁面下方常駐的 Performance Overview 區塊」，而那個區塊在
// 使用者還沒點任何東西之前，就已經佔著版面顯示一個任意挑到的動作。
// 改成就地展開後預設全部收合，沒點就不佔空間，也就沒有「任意挑一個」的問題。
const emit = defineEmits(['select']);

// 顏色分段。這是視覺分段，不是警報門檻——本功能刻意不通知，
// 因此門檻調整只影響好不好看，改動成本趨近於零。
function levelOf(weeks) {
  if (weeks >= 4) return 'critical';
  if (weeks >= 3) return 'warning';
  return '';
}

// 最近 14 天的組數與次數合併成一欄，避免手機上欄位過多。
// 該視窗內完全沒練時顯示破折號，與「0 組 0 次」區隔——
// 前者是「這段期間沒碰」，後者會讓人以為練了但沒記到數字。
function recentText(row) {
  if (!row.recentSets) return '—';
  return `${row.recentSets}組·${row.recentReps}次`;
}

function maxWeightText(row) {
  return row.maxWeight === null || row.maxWeight === undefined ? '—' : row.maxWeight;
}
</script>

<template>
  <div class="streak-section">
    <div class="streak-header">
      <h2>最近動作總覽</h2>
      <p class="streak-desc">最近練過的 12 個動作。</p>
    </div>

    <div class="streak-panel glass-panel">
      <div v-if="rows.length === 0" class="streak-empty">
        尚無訓練紀錄
      </div>

      <template v-else>
        <div class="streak-row streak-row--head">
          <span class="col-caret"></span>
          <span class="col-exercise">動作</span>
          <span class="col-recent">近2週</span>
          <span class="col-max">最重</span>
          <span class="col-weeks">持續</span>
        </div>
        <template v-for="row in rows" :key="row.exercise">
          <div
            class="streak-row streak-row--clickable"
            @click="emit('select', row.exercise)"
          >
            <span class="col-caret" :class="{ open: expandedExercise === row.exercise }">▸</span>
            <span class="col-exercise">{{ row.exercise }}</span>
            <span class="col-recent">{{ recentText(row) }}</span>
            <span class="col-max">{{ maxWeightText(row) }}</span>
            <span class="col-weeks" :class="levelOf(row.streakWeeks)">{{ row.streakWeeks }}</span>
          </div>
          <slot v-if="expandedExercise === row.exercise" name="panel" :exercise="row.exercise" />
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
.streak-header h2 {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 4px;
  color: var(--text-primary);
}

.streak-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0 0 12px;
  line-height: 1.4;
}

.streak-panel {
  padding: 4px 16px;
}

.streak-row {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr) auto 52px 34px;
  align-items: center;
  gap: 10px;
  height: 30px;
  border-bottom: 1px solid var(--separator-color);
}

.streak-row:last-child {
  border-bottom: none;
}

.streak-row--clickable {
  cursor: pointer;
}

.streak-row--clickable:active {
  background: rgba(255, 255, 255, 0.06);
}

/* 三角形指示的是展開／收合狀態，語意與行為完全對應。
   這與舊 Sparkline 的問題不同：那裡是外觀像可操作元件卻不可點（假的暗示），
   這裡的列真的會因點擊而展開，指示符號描述的就是它實際會做的事。 */
.col-caret {
  font-size: 11px;
  color: var(--text-secondary);
  transition: transform 0.15s ease;
}

.col-caret.open {
  transform: rotate(90deg);
}

.col-exercise {
  font-size: 14px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-recent {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
  color: var(--text-primary);
}

.col-max {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: var(--text-primary);
}

.col-weeks {
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: var(--text-primary);
}

/* 顏色分段：≥4 週紅、3 週琥珀。琥珀色沿用 CycleStatus.vue 既有色值。 */
.col-weeks.critical { color: var(--danger-color); }
.col-weeks.warning { color: #FF9500; }

.streak-row--head .col-exercise,
.streak-row--head .col-recent,
.streak-row--head .col-max,
.streak-row--head .col-weeks {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
}

.streak-empty {
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
}
</style>
