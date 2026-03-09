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
  title: { text: '' },
  xAxis: {
    type: 'datetime',
    labels: {
      style: { color: '#8E8E93' },
      format: '{value:%b %d}'
    },
    gridLineColor: 'rgba(255,255,255,0.1)',
    lineColor: 'rgba(255,255,255,0.1)', // Updated from transparent
    tickColor: 'transparent'
  },
  yAxis: props.dualAxis ? [
    { // Primary Axis (Left - Weight)
      title: { text: null },
      gridLineColor: 'rgba(255,255,255,0.05)',
      labels: { 
        style: { color: '#8E8E93' },
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
    gridLineColor: 'rgba(255,255,255,0.05)',
    labels: { 
      style: { color: '#8E8E93' },
      format: props.yAxisLabel === 'Ratio' ? '{value}x' : '{value}'
    }
  },
  legend: {
    enabled: true,
    itemStyle: { color: '#ffffff', fontWeight: 'normal' },
    itemHoverStyle: { color: '#ffffff' }
  },
  tooltip: {
    shared: true,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    style: { color: '#ffffff' },
    borderRadius: 12,
    borderWidth: 0,
    shadow: false,
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
