## 1. 資料層

- [x] 1.1 在 [src/stores/sessionStore.js](../../../src/stores/sessionStore.js) 新增 getter，回傳最近 16 週容積序列（由舊到新、缺值補 0、固定 16 筆）與 16 週平均；重用 `getMondayOfDate` 與既有週分組邏輯，不改動 `weeklyTrainingVolumeInfo`

## 2. UI

- [x] 2.1 在 [src/views/DashboardView.vue](../../../src/views/DashboardView.vue) 容積卡片內，於「當週容積 + 趨勢」之下加入 16 週長條圖（當週強調、其餘淡色、平均虛線、稀疏月份刻度），外觀依視覺稿
- [x] 2.2 為長條加入 hover/點擊互動：顯示該週日期範圍與容積
- [x] 2.3 卡片顯示「過去 16 週平均」數值
- [x] 2.4 將首頁標題由三行大 `<h1>` 縮為單行小標（純樣式）
- [x] 2.5 確認 sparkline 列、HistoryChart、FilterControls 均未受影響（Non-Goals 把關）

## 3. 驗證

- [x] 3.1 以實際紀錄在 Dashboard 確認：16 根長條、當週強調、平均虛線、空白週補 0、hover 明細皆正確
- [x] 3.2 確認淺色/深色模式下卡片與長條圖皆正常
- [x] 3.3 對照視覺稿確認外觀一致
