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

### Requirement: Provide Trailing 16-Week Volume Series
系統 SHALL 提供最近 16 個日曆週（含當週，往回共 16 週）的訓練容積序列，供首頁圖表使用。每一週的容積為該週內所有訓練紀錄的 `reps * weight` 加總；**沒有任何紀錄的週 SHALL 以 0 表示且不得省略**，使序列固定為 16 筆、依時間由舊到新排序。系統 SHALL 一併提供此 16 週的平均容積。

#### Scenario: 序列固定 16 筆並補零
- **WHEN** 過去 16 週中僅有 3 個週有訓練紀錄
- **THEN** 回傳的序列仍 SHALL 為 16 筆，其中 13 筆容積為 0，且順序由最舊週到當週

#### Scenario: 平均值涵蓋全部 16 週
- **WHEN** 16 週容積序列為已知值
- **THEN** 系統 SHALL 回傳「16 週平均 = 序列總和 / 16」（含補 0 的週一併計入）

### Requirement: Display 16-Week Volume Bar Chart
首頁的容積卡片 SHALL 在既有的「當週總容積與趨勢」之下，以長條圖顯示過去 16 週的容積序列：每一週一根長條、當週該根 SHALL 以強調樣式呈現、其餘週以次要樣式呈現。卡片 SHALL 顯示一條代表 16 週平均的參考線，並顯示 16 週平均的數值。使用者對某一週長條進行 hover 或點擊時，系統 SHALL 顯示該週的日期範圍與容積數值。

#### Scenario: 呈現 16 根長條與當週強調
- **WHEN** 使用者開啟首頁
- **THEN** 容積卡片 SHALL 顯示 16 根長條（依週序），且最新一根（當週）以強調樣式與其他週區隔

#### Scenario: 空白週顯示為零高度
- **WHEN** 某一週容積為 0
- **THEN** 該週 SHALL 顯示為零高度的空缺，而非從圖中略過

#### Scenario: 互動顯示單週明細
- **WHEN** 使用者 hover 或點擊某一週的長條
- **THEN** 系統 SHALL 顯示該週的日期範圍與容積數值
