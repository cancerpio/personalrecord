## ADDED Requirements

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
