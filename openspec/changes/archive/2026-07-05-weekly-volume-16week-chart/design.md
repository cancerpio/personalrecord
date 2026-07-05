## Context

首頁容積卡片 [DashboardView.vue](../../../src/views/DashboardView.vue) 目前只顯示當週容積與趨勢徽章。資料層 [sessionStore.js](../../../src/stores/sessionStore.js) 的 `weeklyTrainingVolumeInfo` getter 內部已經在做「以週分組加總容積」（`weeklyVolumes`），但只回傳當週/歷史平均/趨勢，未對外提供逐週序列。專案已內建 `highcharts` + `highcharts-vue`，既有 HistoryChart 即以此繪製。

**視覺基準（實作須依此為準）**：https://claude.ai/code/artifact/c423bc20-42eb-4b3a-b7bd-c40a3066f23a

## Goals / Non-Goals

**Goals:**
- 在容積卡片內呈現過去 16 週容積長條圖（iPhone 健康風），含平均虛線與單週互動明細。
- 資料層提供固定 16 筆、補 0、由舊到新的週序列與 16 週平均。

**Non-Goals（明確不做）:**
- **不改動** [SparklineRow.vue](../../../src/components/SparklineRow.vue)（動作趨勢列）、HistoryChart（歷史圖表）、FilterControls（篩選器）—— 三者原樣保留。
- **不改動**容積公式 `reps × weight`、趨勢門檻（±5%）、週邊界（週一~週日、UTC）。
- **不做**週數切換（8/16/26），本次固定 16 週。
- 不動資料模型、後端、無資料遷移。

## Decisions

- **新增 getter 而非改寫既有**：新增一個回傳「最近 16 週序列 + 平均」的 getter，重用 `getMondayOfDate` 與既有分組邏輯；`weeklyTrainingVolumeInfo` 維持不動，降低回歸風險。
- **補零策略**：以「當週的星期一」往回推 15 個星期一，逐週查表，缺值補 0 → 保證固定 16 筆、時間軸連續。
- **繪圖工具**：優先沿用 `highcharts-vue`（與 HistoryChart 一致）；若 Highcharts 呈現 iPhone 風長條（圓角、當週強調、平均虛線、極簡軸）成本過高，退而用純 CSS/SVG 長條（視覺稿即以純 CSS 實作，可直接參照）。此為實作細節，最終以視覺稿外觀為驗收標準。
- **當週強調**：以「當週」這個固定語意做樣式區隔（實色 vs 淡色），非依數值大小排名。
- **標題縮小**：純 CSS，將三行大 `<h1>` 調整為單行小標，讓出垂直空間。

## Risks / Trade-offs

- [Highcharts 客製成本] iPhone 風的極簡長條在 Highcharts 上可能需要不少 option 客製 → 緩解：允許以純 CSS/SVG 實作（視覺稿已驗證可行），驗收看外觀而非實作方式。
- [效能] 16 週序列由既有 sessions 於前端即時彙總，資料量小、無虞。
- [空白週語意] 補 0 的週在圖上是空缺，使用者需理解「該週沒訓練」→ hover tooltip 會顯示 0，語意清楚。
