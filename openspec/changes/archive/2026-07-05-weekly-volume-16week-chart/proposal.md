## Why

目前首頁「當週訓練總容積」卡片只顯示單一數字與趨勢，看不出中期走勢。使用者希望像 iPhone 健康 App 的步數呈現方式，用長條圖一眼看出過去 16 週的訓練容積變化，強化「有沒有在進步/退步」的體感。

視覺方向已先以視覺稿確認：https://claude.ai/code/artifact/c423bc20-42eb-4b3a-b7bd-c40a3066f23a

## What Changes

- 在容積卡片內**新增過去 16 週的容積長條圖**：每根長條 = 該週總容積（Σ `reps × weight`），共 16 根，最後一根為當週並以實色強調、其餘淡色。
- 加上一條**平均參考虛線**（過去 16 週平均），並在卡片顯示「過去 16 週平均」數值。
- 沒訓練的週顯示為高度 0 的空缺（維持 16 格連續，不跳過）。
- X 軸僅標示稀疏月份；滑過/點擊長條顯示該週日期範圍與容積。
- 卡片頂部**保留**既有的「當週總容積大數字 + 趨勢徽章」。
- 首頁標題 `Strength and Conditioning Analytics` 由三行大標縮為單行小標，讓出垂直空間（純樣式調整）。

## Capabilities

### New Capabilities
<!-- 本次不新增能力 -->

### Modified Capabilities
- `weekly-training-volume`: 新增「提供過去 16 週容積序列」與「以長條圖顯示 16 週容積」兩條需求；既有的容積計算、趨勢判定、單週顯示需求不變。

## Impact

- **程式碼**：
  - [src/stores/sessionStore.js](../../../src/stores/sessionStore.js)：新增一個回傳「最近 16 週容積序列（含空白週補 0）」的 getter，重用既有的週分組邏輯。
  - [src/views/DashboardView.vue](../../../src/views/DashboardView.vue)：容積卡片內加入長條圖；標題縮小。
  - 可能新增一個長條圖子元件（沿用專案既有的 `highcharts` / `highcharts-vue`，不新增相依）。
- **Non-Goals（明確不做，避免誤解為整頁重做）**：
  - **不改動**動作趨勢列 [SparklineRow.vue](../../../src/components/SparklineRow.vue)、歷史圖表 HistoryChart、篩選器 FilterControls —— 三者完全保留。
  - **不改動**容積公式（`reps × weight`）與趨勢判定門檻（±5%）、週邊界（週一~週日、UTC）等既有邏輯。
  - **不做**週數切換（8/16/26）—— 本次固定 16 週。
  - **不涉及**資料模型或後端變更、無資料遷移。
