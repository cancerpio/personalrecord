## 1. 文件化

- [x] 1.1 確認 [src/stores/sessionStore.js](../../../src/stores/sessionStore.js) 的 `getMondayOfDate` 現行行為與新增規格一致（週一~週日、UTC 判定、週日回推至前一個週一）
- [x] 1.2 archive 時將 delta spec sync 併回 `openspec/specs/weekly-training-volume/spec.md`

## 2. 測試（可選）

- [ ] 2.1 （可選）新增週界 regression 測試：驗證 2026-07-05(日)、2026-07-01(三)、2026-06-29(一) 皆歸入週一 2026-06-29
