## Why

「每週訓練容積」的週分組行為（週界為週一~週日、且以 UTC 計算星期幾）目前只存在於程式碼，主規格僅寫了 "Monday to Sunday"，未涵蓋「以 UTC 判定」這層，也未明確描述週日的歸屬。本變更純粹將**既有行為文件化進規格**，**不改動任何功能**，以補上規格與實作之間的落差、並留下追溯紀錄。

## What Changes

- 於 `weekly-training-volume` 規格**新增一條需求**，明確定義週分組邊界：每筆紀錄依日期歸入「週一（起）~ 週日（迄）」的訓練週，且該週的星期一以 **UTC** 的星期幾推導。
- **無程式碼變更**：`getMondayOfDate` 的實作維持現狀，本變更只描述它既有的行為。
- 一併以規格附註記錄「UTC+8 使用者在週日深夜~週一凌晨交界，紀錄可能落入相鄰週」為**目前的已知行為**（非本次修正對象）。

## Capabilities

### New Capabilities
<!-- 本次不新增能力 -->

### Modified Capabilities
- `weekly-training-volume`: 新增「週分組邊界定義」需求（ADDED），明確化既有的週一~週日、UTC 判定行為。不改變既有需求的行為。

## Impact

- **規格**：`openspec/specs/weekly-training-volume/spec.md`（新增一條需求）。
- **程式碼**：無變更。
- **測試**：可選擇性新增一個週界的 regression 測試以鎖定行為。
- **相依/資料**：無。
