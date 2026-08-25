<script setup>
defineProps({
  rows: {
    type: Array,
    default: () => []
  }
});

// 顏色分段。這是視覺分段，不是警報門檻——本功能刻意不通知，
// 因此門檻調整只影響好不好看，改動成本趨近於零。
function levelOf(weeks) {
  if (weeks >= 4) return 'critical';
  if (weeks >= 3) return 'warning';
  return '';
}
</script>

<template>
  <div class="streak-section">
    <div class="streak-header">
      <h2>最近動作連續週數</h2>
      <p class="streak-desc">同一動作目前連續幾週沒換過，最多列出最近練到的 12 個動作。數字越大代表該受力結構被連續使用越久，可考慮安排變化動作；歸零代表已中斷。</p>
    </div>

    <div class="streak-panel glass-panel">
      <div v-if="rows.length === 0" class="streak-empty">
        尚無訓練紀錄
      </div>

      <template v-else>
        <div class="streak-row streak-row--head">
          <span class="col-exercise">動作</span>
          <span class="col-weeks">連續週數</span>
          <span class="col-date">最後練到</span>
        </div>
        <div v-for="row in rows" :key="row.exercise" class="streak-row">
          <span class="col-exercise">{{ row.exercise }}</span>
          <span class="col-weeks" :class="levelOf(row.streakWeeks)">{{ row.streakWeeks }}</span>
          <span class="col-date">{{ row.lastDate }}</span>
        </div>
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
  grid-template-columns: 1fr auto 92px;
  align-items: center;
  gap: 12px;
  height: 30px;
  border-bottom: 1px solid var(--separator-color);
}

.streak-row:last-child {
  border-bottom: none;
}

.col-exercise {
  font-size: 14px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-weeks {
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: right;
  min-width: 32px;
  color: var(--text-primary);
}

/* 顏色分段：≥4 週紅、3 週琥珀。琥珀色沿用 CycleStatus.vue 既有色值。 */
.col-weeks.critical { color: var(--danger-color); }
.col-weeks.warning { color: #FF9500; }

.col-date {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: var(--text-secondary);
}

.streak-row--head .col-exercise,
.streak-row--head .col-weeks,
.streak-row--head .col-date {
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
