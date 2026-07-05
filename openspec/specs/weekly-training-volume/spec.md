# Capability: Weekly Training Volume

## Purpose
This capability calculates and tracks the weekly training volume and provides comparison trends against the historical average on the user's dashboard.

## Requirements

### Requirement: Calculate Weekly Training Volume
系統 SHALL 計算當前日曆週（週一到週日）的訓練容積：對該週內所有訓練紀錄加總 `reps * weight`。

每一筆 session 紀錄代表「一組(set)」，欄位為 `{ date, exercise, weight, reps }`，資料模型中並無 `sets` 欄位；「幾組」已由「有幾筆紀錄」體現。因此容積公式為逐筆加總 `reps * weight`，不再乘以 `sets`。此定義天生支援同一動作各組使用不同重量的情況。

#### Scenario: Calculate volume with multiple sets
- **WHEN** the user has training sessions in the current week with (reps=5, weight=50), (reps=5, weight=30), and (reps=5, weight=20)
- **THEN** the weekly training volume SHALL be 500 (5*50 + 5*30 + 5*20)

### Requirement: Weekly Grouping Boundary
系統 SHALL 依每筆訓練紀錄的日期，將其歸入一個「訓練週」；訓練週的範圍為**週一（起）至週日（迄）**。該週所屬的「星期一」SHALL 以 UTC 的星期幾（day-of-week）推導，週日 SHALL 歸入「其前一個週一所開始的那一週」。

備註（記錄目前已知行為，非正規需求）：由於星期幾以 UTC 判定，對 UTC+8 使用者而言，落在週日深夜至週一凌晨交界的紀錄，可能被歸入相鄰的一週。

#### Scenario: Sunday belongs to the week that started the previous Monday
- **WHEN** a training session is dated 2026-07-05 (a Sunday)
- **THEN** it SHALL be grouped into the training week beginning Monday 2026-06-29

#### Scenario: A weekday maps to its own week's Monday
- **WHEN** a training session is dated 2026-07-01 (a Wednesday)
- **THEN** it SHALL be grouped into the training week beginning Monday 2026-06-29

#### Scenario: Monday maps to itself
- **WHEN** a training session is dated 2026-06-29 (a Monday)
- **THEN** it SHALL be grouped into the training week beginning Monday 2026-06-29

### Requirement: Calculate Historical Average and Trend
The system SHALL calculate the historical weekly training volume average by grouping all past sessions by calendar week (Monday to Sunday, excluding the current week). The system SHALL compare the current week's training volume to this historical average to determine the trend.
- A current volume greater than 105% of the average SHALL be classified as "UP" (上升).
- A current volume less than 95% of the average SHALL be classified as "DOWN" (下降).
- A current volume within 95% to 105% (inclusive) of the average SHALL be classified as "STABLE" (持平).

#### Scenario: Trend is UP
- **WHEN** the current week volume is 5000 and the historical weekly average is 4000
- **THEN** the trend classification SHALL be "UP"

#### Scenario: Trend is DOWN
- **WHEN** the current week volume is 3000 and the historical weekly average is 4000
- **THEN** the trend classification SHALL be "DOWN"

#### Scenario: Trend is STABLE
- **WHEN** the current week volume is 4100 and the historical weekly average is 4000
- **THEN** the trend classification SHALL be "STABLE"

### Requirement: Display Volume and Trend on Homepage
The system SHALL display the current week's training volume and its compared trend on the dashboard page.

#### Scenario: Dashboard rendering
- **WHEN** the user visits the dashboard homepage
- **THEN** the system SHALL show the weekly training volume card with the current total and a trend icon matching the trend classification
