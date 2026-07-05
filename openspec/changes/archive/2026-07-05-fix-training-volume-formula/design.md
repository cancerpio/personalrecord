## Context

`weeklyTrainingVolumeInfo`（Pinia getter，位於 [src/stores/sessionStore.js](../../../src/stores/sessionStore.js)）以 `sets * reps * weight` 計算每筆紀錄的容積。但實際資料模型中，一筆 session 紀錄即代表「一組(set)」，只有 `{ date, exercise, weight, reps }`，並無 `sets` 欄位。因此 `session.sets` 恆為 `undefined`，`(session.sets || 0)` 恆為 0，導致所有容積、歷史平均為 0，趨勢恆判為「持平」。同頁 sparkline 僅使用 `weight`/`reps`，故不受影響、能正常顯示 —— 這也佐證資料本身正常，問題純在公式。

## Goals / Non-Goals

**Goals:**
- 讓當週容積、歷史每週平均、趨勢依真實資料正確計算與顯示。
- 使規格的容積定義與真實資料模型一致。

**Non-Goals:**
- 不改變資料模型（不新增 `sets` 欄位）。
- 不變更趨勢判定門檻（±5%）、週邊界（週一至週日）等既有正確邏輯。
- 不改動顯示層（DashboardView 卡片）。

## Decisions

- **公式改為逐筆加總 `reps * weight`**：因每筆紀錄本身就是一組，「組數」已由「紀錄筆數」表達。逐筆加總天生正確，且能處理同一動作各組不同重量（例如 50/30/20 kg 遞減組）。
  - 替代方案（已否決）：在資料模型補上 `sets` 欄位並回填舊資料 —— 成本高、有遷移風險，且與「一筆=一組」的既有輸入流程（RecordView 將多筆 group 成 sets 顯示）相衝突。
- **修正點僅一處**：`weeklyTrainingVolumeInfo` 內計算 `vol` 的該行；週分組、平均、趨勢邏輯維持不變。

## Risks / Trade-offs

- [歷史資料語意] 舊資料一直以 0 呈現，修正後容積會「突然變大」→ 這是回復正確值，屬預期行為，非退化。
- [單位標示] 卡片單位標為 `kg`，而容積實為 tonnage（總搬運量）→ 屬既有的語意瑕疵，本次不處理，避免擴大範圍；如需修正另開變更。
