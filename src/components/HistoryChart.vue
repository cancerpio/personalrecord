<script setup>
import { computed } from 'vue';

const props = defineProps({
  series:Array,
  loading: Boolean
});

const chartOptions = computed(() => ({
  chart: {
    type: 'spline',
    backgroundColor: 'transparent',
    style: {
      fontFamily: 'Inter, sans-serif'
    },
    animation: true
  },
  title: { text: '' },
  xAxis: {
    type: 'datetime',
    labels: {
      style: { color: '#8E8E93' }
    },
    gridLineColor: 'rgba(255,255,255,0.1)',
    lineColor: 'transparent',
    tickColor: 'transparent'
  },
  yAxis: {
    title: { text: null },
    labels: {
      style: { color: '#8E8E93' }
    },
    gridLineColor: 'rgba(142, 142, 147, 0.2)'
  },
  legend: {
    itemStyle: { color: 'var(--text-primary)' },
    itemHoverStyle: { color: 'var(--accent-color)' }
  },
  tooltip: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(10px)',
    borderRadius: 12,
    borderWidth: 0,
    shadow: true,
    style: { color: '#000' }
  },
  series: props.series,
  credits: { enabled: false },
  plotOptions: {
    spline: {
      marker: {
        enabled: true,
        radius: 4,
        symbol: 'circle'
      },
      lineWidth: 3
    }
  }
}));
</script>

<template>
  <div class="chart-container glass-card">
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
    </div>
    <highcharts class="hc" :options="chartOptions"></highcharts>
  </div>
</template>

<style scoped>
.chart-container {
  position: relative;
  min-height: 300px;
  overflow: hidden;
}

.hc {
  width: 100%;
  height: 300px;
}

.loading-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255,255,255,0.2);
  backdrop-filter: blur(5px);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: inherit;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
