## MODIFIED Requirements

### Requirement: Calculate Weekly Training Volume
系統 SHALL 計算當前日曆週（週一到週日）的訓練容積：對該週內所有訓練紀錄加總 `reps * weight`。

每一筆 session 紀錄代表「一組(set)」，欄位為 `{ date, exercise, weight, reps }`，資料模型中並無 `sets` 欄位；「幾組」已由「有幾筆紀錄」體現。因此容積公式為逐筆加總 `reps * weight`，不再乘以 `sets`。此定義天生支援同一動作各組使用不同重量的情況。

#### Scenario: Calculate volume with multiple sets
- **WHEN** the user has training sessions in the current week with (reps=5, weight=50), (reps=5, weight=30), and (reps=5, weight=20)
- **THEN** the weekly training volume SHALL be 500 (5*50 + 5*30 + 5*20)
