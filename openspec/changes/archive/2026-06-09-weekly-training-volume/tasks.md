## 1. Store Updates

- [x] 1.1 在 `src/stores/sessionStore.js` 中實作 `getMondayOfDate` 輔助函式，支援將 `YYYY-MM-DD` 格式的日期換算為對應週之週一日期（UTC 標準）。
- [x] 1.2 在 `src/stores/sessionStore.js` 中新增 `weeklyTrainingVolumeInfo` getter，用於動態彙整當週訓練容積、歷史每週平均值（排除當週）以及決定容積趨勢（上升、持平、下降）。

## 2. Dashboard UI Integration

- [x] 2.1 在 `src/views/DashboardView.vue` 中引入 `weeklyTrainingVolumeInfo` 並將其解構為反應式變數。
- [x] 2.2 在 `src/views/DashboardView.vue` 的 Template 中，於標題下方、Sparkline 行上方，新增一個高質感毛玻璃風格的訓練容積顯示卡片。
- [x] 2.3 在 `DashboardView.vue` 中實作對應的 CSS 樣式，並配合 `up`、`down`、`stable` 及 `none` 顯示對應的趨勢圖標與顏色。
