<script setup>
import { computed } from 'vue';

const props = defineProps({
  series: {
    type: Array,
    default: () => []
  },
  loading: Boolean,
  dualAxis: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  yAxisLabel: {
    type: String,
    default: 'Weight (kg)'
  }
});

const chartOptions = computed(() => ({
  chart: {
    type: 'area', // Mixed types (area, line) handled in series config
    backgroundColor: 'transparent',
    style: {
      fontFamily: 'Inter, sans-serif'
    },
    animation: true,
    height: 300,
    spacingTop: 20
  },
  title: { text: null },
  xAxis: {
    type: 'datetime',
    labels: {
      style: { color: 'var(--text-secondary)' },
      format: '{value:%b %d}'
    },
    gridLineColor: 'var(--glass-border)',
    lineColor: 'var(--glass-border)',
    tickColor: 'transparent'
  },
  yAxis: props.dualAxis ? [
    { // Primary Axis (Left - Weight)
      title: { text: null },
      gridLineColor: 'var(--glass-border)',
      labels: { 
        style: { color: 'var(--text-secondary)' },
        format: '{value} KG'
      }
    },
    { // Secondary Axis (Right - Body Fat/Percentage)
      title: { text: null },
      opposite: true,
      gridLineWidth: 0,
      labels: { 
        style: { color: '#FF9500', fontWeight: 'bold' },
        format: '{value}%'
      }
    }
  ] : { // Single Axis
    title: { text: null },
    gridLineColor: 'var(--glass-border)',
    labels: { 
      style: { color: 'var(--text-secondary)' },
      format: props.yAxisLabel === 'Ratio' ? '{value}x' : '{value}'
    }
  },
  legend: {
    enabled: true,
    itemStyle: { color: 'var(--text-primary)', fontWeight: 'normal' },
    itemHoverStyle: { color: 'var(--text-primary)' }
  },
  tooltip: {
    shared: true,
    backgroundColor: 'var(--card-bg-blur)',
    style: { color: 'var(--text-primary)' },
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'var(--glass-border)',
    shadow: true,
    headerFormat: '<span style="font-size: 10px">{point.key:%b %d}</span><br/>'
  },
  series: props.series,
  credits: { enabled: false },
  plotOptions: {
    area: {
      marker: { enabled: false },
      fillOpacity: 0.15,
      lineWidth: 2
    },
    line: {
      marker: { enabled: false },
      lineWidth: 2
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
