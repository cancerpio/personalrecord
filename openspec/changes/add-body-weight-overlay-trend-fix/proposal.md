## Why

首頁容積卡片目前只呈現訓練量，無法對照體重變化；而趨勢徽章拿「本週到當日的部分加總」去比「過去各完整週平均」，部分週對完整週不對稱，導致週初幾乎必然顯示「下降」，誤導使用者。此變更同時補上體重對照，並修正趨勢比較的基準。

## What Changes

- 資料層新增每週平均體重：16 週序列每一週加上 `avgBodyWeight`（該週體重紀錄平均，無紀錄為 `null`）。
- 首頁 16 週長條圖疊加「每週平均體重」折線，形成雙軸對照圖（容積柱＝左軸、體重線＝右軸）。缺值週折線斷開留空、不補 0、不內插。
- **BREAKING（趨勢語意變更）**：趨勢比較由「當週部分加總 vs 過去完整週平均」改為「上一個已結束的完整週 vs 更早各完整週平均」（方案 2A）。當週即時容積仍作為卡片大數字顯示。只有一個完整週時趨勢顯示「持平」。
- 標頭改為左右兩欄：左＝當週訓練總容積、右＝當週平均體重，各自附趨勢小 chip 與共用的基準說明小字。體重趨勢採中性樣式（非好壞語意）。

## Capabilities

### New Capabilities
<!-- 無新增 capability；皆為既有 weekly-training-volume 的需求變更與擴充 -->

### Modified Capabilities
- `weekly-training-volume`: 修改「歷史平均與趨勢」的比較基準（改為完整週對完整週，2A）；新增「每週平均體重序列」、「體重折線疊加圖」、「標頭雙欄與體重當週摘要」等需求。

## Impact

- 程式碼：
  - [src/stores/sessionStore.js](../../../src/stores/sessionStore.js)：`trailing16WeekVolumeInfo` 擴充 `avgBodyWeight`；`weeklyTrainingVolumeInfo` 趨勢改採 2A，並提供當週平均體重與其趨勢。
  - [src/views/DashboardView.vue](../../../src/views/DashboardView.vue)：容積卡片標頭改雙欄；16 週圖由純 CSS 改用 Highcharts combo（column + line + 雙軸）。
- 依賴：沿用既有 `highcharts` / `highcharts-vue`，無新增套件。
- 資料模型：不變，無資料遷移。`bodyMetrics` 沿用既有 `{ date, bodyWeight, fatPercentage }`。
- 相容性：`trailing16WeekVolumeInfo` 為 additive 欄位；趨勢語意變更會改變徽章顯示結果（既有測試與快照需同步更新）。
