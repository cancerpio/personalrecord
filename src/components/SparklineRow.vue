<script setup>
import { computed } from 'vue';
import Highcharts from 'highcharts';

const props = defineProps({
  data: Array
});

// Helper to determine arrow and color based on status
const statusInfo = computed(() => {
  switch (props.data.status) {
    case 'up': return { icon: '↗', color: 'var(--success-color)', label: 'Trending Up' };
    case 'down': return { icon: '↘', color: 'var(--danger-color)', label: 'Trending Down' };
    default: return { icon: '→', color: 'var(--text-secondary)', label: 'Stable' };
  }
});

const chartOptions = computed(() => ({
  chart: {
    type: 'area',
    backgroundColor: 'transparent',
    margin: [0, 0, 0, 0],
    height: 40
  },
  title: { text: '' },
  credits: { enabled: false },
  xAxis: { visible: false },
  yAxis: { visible: false },
  legend: { enabled: false },
  tooltip: { enabled: false },
  plotOptions: {
    area: {
      fillColor: {
        linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
        stops: [
          [0, statusInfo.value.color],
          [1, 'rgba(255,255,255,0)']
        ]
      },
      fillOpacity: 0.2,
      lineColor: statusInfo.value.color,
      lineWidth: 2,
      marker: { enabled: false }
    }
  },
  series: [{
    data: props.data.data
  }]
}));
</script>

<template>
  <div class="spark-row glass-panel">
    <div class="info-col">
      <span class="ex-icon">{{ data.icon }}</span>
      <span class="ex-name">{{ data.name }}</span>
    </div>
    <div class="chart-wrapper">
      <div class="chart-col">
        <highcharts :options="chartOptions" style="width: 60px; height: 32px;"></highcharts>
      </div>
      <span class="status-label" :style="{ color: statusInfo.color }">
        {{ statusInfo.icon }} {{ statusInfo.label }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.spark-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.4);
}

.info-col {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px; /* iOS standard spacing between leading icon and text */
}

.ex-icon {
  font-size: 20px;
  width: 24px;
  text-align: center;
  /* Ideally this would be an SVG, using emoji as placeholder for SF Symbol concept */
}

.ex-name {
  font-weight: 600;
  font-size: 15px;
}

.chart-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-label {
  font-size: 12px;
  font-weight: 600;
  text-align: right;
  min-width: 100px;
}

.chart-col {
  width: 60px;
  height: 32px;
}
</style>
