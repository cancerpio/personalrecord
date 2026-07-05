## Why

儀表板上的「當週訓練總容積」「歷史每週平均容積」永遠顯示 0、趨勢永遠是「持平」，但使用者其實一直有訓練紀錄（同頁的 sparkline 有正常顯示）。根因是容積公式乘上了一個資料模型中根本不存在的 `session.sets` 欄位，導致每一筆、每一週的容積都被歸零。這是使用者能直接看到的功能失效，需要修正。

## What Changes

- 修正 [src/stores/sessionStore.js](../../../src/stores/sessionStore.js) 中 `weeklyTrainingVolumeInfo` 的容積計算：由 `sets × reps × weight` 改為 **`reps × weight`**（逐筆 set-row 加總）。
- 校正 `weekly-training-volume` 規格的容積定義措辭，使其符合真實資料模型：**一筆 session 紀錄即代表「一組(set)」**，欄位為 `{ date, exercise, weight, reps }`，並無 `sets` 欄位。因此當週容積 = 對所有 set-row 加總 `reps × weight`。
- 顯示端（DashboardView 卡片）**不需修改** —— 公式修正後，數字、平均、趨勢會自動恢復正確。

## Capabilities

### New Capabilities
<!-- 本次不新增能力 -->

### Modified Capabilities
- `weekly-training-volume`: 「Calculate Weekly Training Volume」需求的容積公式定義由 `sets × reps × weight` 修正為對所有 set-row 加總 `reps × weight`，以符合「一筆紀錄=一組」的資料模型（此模型也天生支援同一動作各組不同重量的情況）。

## Impact

- **程式碼**：[src/stores/sessionStore.js](../../../src/stores/sessionStore.js) 的 `weeklyTrainingVolumeInfo` getter（容積乘積該行）。
- **規格**：`openspec/specs/weekly-training-volume/spec.md` 的容積計算需求與其 Scenario 範例數值。
- **顯示**：[src/views/DashboardView.vue](../../../src/views/DashboardView.vue) 的容積卡片會自動顯示正確數值，無需改動。
- **資料/相依**：無資料遷移、無新相依套件、無破壞性變更。
