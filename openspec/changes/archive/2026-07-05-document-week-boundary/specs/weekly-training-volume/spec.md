## ADDED Requirements

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
