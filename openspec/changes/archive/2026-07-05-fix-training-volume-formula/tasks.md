## 1. 修正容積計算

- [x] 1.1 在 [src/stores/sessionStore.js](../../../src/stores/sessionStore.js) 的 `weeklyTrainingVolumeInfo` 中，將 `vol` 由 `(session.sets || 0) * (session.reps || 0) * (session.weight || 0)` 改為 `(session.reps || 0) * (session.weight || 0)`
- [x] 1.2 確認週分組（`getMondayOfDate`）、歷史平均、趨勢判定（±5%）邏輯維持不變

## 2. 驗證

- [ ] 2.1 用實際訓練紀錄在 Dashboard 確認「當週訓練總容積」「歷史每週平均容積」顯示為正確非零值，且會隨紀錄更新（← 待使用者於實機 Dashboard 眼睛確認）
- [x] 2.2 驗證遞減組情境：本週三組 (reps=5,weight=50)、(reps=5,weight=30)、(reps=5,weight=20) → 當週容積應為 500
- [x] 2.3 確認趨勢圖示與 statusLabel 會依 current 對 average 的比值正確切換（上升/持平/下降）
- [x] 2.4 執行 `openspec validate fix-training-volume-formula` 確認 change 格式通過
