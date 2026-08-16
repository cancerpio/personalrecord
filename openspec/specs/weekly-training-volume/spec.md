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
系統 SHALL 以「當週即時總量」對「過往完整週平均」的方式判定趨勢。當週即時總量即為畫面上的當週訓練總容積（週一到當日的部分加總），也就是被比較的值本身。

定義：
- 「有訓練紀錄且非當週」的各週稱為「完整週」。
- 歷史平均 SHALL 為所有完整週容積的算術平均。

系統 SHALL 以「當週即時總量」對「完整週平均」判定趨勢，門檻維持 ±5%：
- 當週總量 > 平均 105% SHALL 判定為 "UP"（上升）。
- 當週總量 < 平均 95% SHALL 判定為 "DOWN"（下降）。
- 介於 95%～105%（含）之間 SHALL 判定為 "STABLE"（持平）。

當存在至少一個完整週時，系統 SHALL 直接以當週總量與完整週平均比較（即使只有一個完整週，也不再固定顯示持平）。當完全沒有完整週時，維持既有的無資料處理（有當週容積則顯示「首週訓練中」）。

由於當週為進行中的部分加總，週初可能因累積尚少而顯示為 "DOWN"；此為已知並接受的取捨。

#### Scenario: Trend is UP
- **WHEN** 當週即時總量為 5000，過往完整週平均為 4000
- **THEN** 趨勢分類 SHALL 為 "UP"

#### Scenario: Trend is DOWN
- **WHEN** 當週即時總量為 4200，過往完整週平均為 10000
- **THEN** 趨勢分類 SHALL 為 "DOWN"

#### Scenario: Trend is STABLE
- **WHEN** 當週即時總量為 10200，過往完整週平均為 10000（在 ±5% 內）
- **THEN** 趨勢分類 SHALL 為 "STABLE"

#### Scenario: 只有一個完整週也直接比較
- **WHEN** 除了當週之外僅存在一個完整週，且當週總量高於該完整週 105%
- **THEN** 趨勢 SHALL 判定為 "UP"（不再固定為持平）

#### Scenario: 沒有任何完整週
- **WHEN** 僅有當週且尚無完整週、當週已有容積
- **THEN** 系統 SHALL 顯示「首週訓練中」

### Requirement: Display Volume and Trend on Homepage
首頁的容積卡片標頭 SHALL 以左右兩欄呈現兩項當週摘要：左欄為「當週訓練總容積」（週一到當日的即時加總），右欄為「當週平均體重」。每一欄 SHALL 各自顯示其大數字與一個趨勢指示 chip。

容積趨勢 chip SHALL 依「Calculate Historical Average and Trend」的分類（UP/DOWN/STABLE）呈現對應圖示與好壞語意色（上升為正向色）。趨勢基準為「當週總量 vs 過往完整週平均」，被比較的值即為畫面上的當週即時數字；卡片 SHALL 顯示一行共用的基準說明文字（例如「趨勢基準：當週總量 vs 過往完整週平均」）。

#### Scenario: Dashboard rendering
- **WHEN** 使用者開啟首頁
- **THEN** 容積卡片標頭 SHALL 顯示左欄「當週訓練總容積」與右欄「當週平均體重」，兩者各附趨勢 chip，並顯示一行共用的趨勢基準說明

#### Scenario: 趨勢反映當週總量
- **WHEN** 當週即時總量高於過往完整週平均 105%
- **THEN** 容積趨勢 chip SHALL 顯示為上升，且卡片 SHALL 以基準說明文字標明比較對象為過往完整週平均

### Requirement: Provide Trailing 12-Week Volume Series
系統 SHALL 提供最近 12 個日曆週（含當週，往回共 12 週）的訓練容積序列，供首頁圖表使用。每一週的容積為該週內所有訓練紀錄的 `reps * weight` 加總；**沒有任何紀錄的週 SHALL 以 0 表示且不得省略**，使序列固定為 12 筆、依時間由舊到新排序。系統 SHALL 一併提供此 12 週的平均容積。

#### Scenario: 序列固定 12 筆並補零
- **WHEN** 過去 12 週中僅有 3 個週有訓練紀錄
- **THEN** 回傳的序列仍 SHALL 為 12 筆，其中 9 筆容積為 0，且順序由最舊週到當週

#### Scenario: 平均值涵蓋全部 12 週
- **WHEN** 12 週容積序列為已知值
- **THEN** 系統 SHALL 回傳「12 週平均 = 序列總和 / 12」（含補 0 的週一併計入）

### Requirement: Display 12-Week Volume Bar Chart
首頁的容積卡片 SHALL 在標頭之下，以長條圖顯示過去 12 週的容積序列：每一週一根長條、其餘週以次要樣式呈現。**當週該根為「週一到當日」的部分累積值，SHALL 以「進行中」樣式（如 ghost／虛線外框）並輔以進行中標示呈現，明確表達其為未完成的部分加總，避免被誤讀為容積驟降。** 卡片 SHALL 顯示一條代表 12 週平均的參考線，並顯示 12 週平均的數值。使用者對某一週長條進行 hover 或點擊時，系統 SHALL 顯示該週明細。

#### Scenario: 當週柱以進行中樣式呈現
- **WHEN** 使用者開啟首頁，且當週僅累積到當日的部分容積
- **THEN** 當週長條 SHALL 以進行中樣式（ghost／虛線外框 + 進行中標示）與其他完整週區隔，而非畫成一般實柱

#### Scenario: 空白週顯示為零高度
- **WHEN** 某一週容積為 0
- **THEN** 該週 SHALL 顯示為零高度的空缺，而非從圖中略過

#### Scenario: 互動顯示單週明細
- **WHEN** 使用者 hover 或點擊某一週的長條
- **THEN** 系統 SHALL 顯示該週的日期範圍與容積數值

### Requirement: Provide Trailing 12-Week Average Body Weight
系統 SHALL 在最近 12 週的序列中，為每一週提供該週的平均體重 `avgBodyWeight`。每一週的平均體重 SHALL 為該週（週一到週日，沿用既有 UTC 週邊界）內所有體重紀錄 `bodyWeight` 的算術平均；**該週若無任何體重紀錄，`avgBodyWeight` SHALL 為 `null`**（不得補 0，不得內插）。此欄位 SHALL 以新增方式提供，不影響既有 12 週容積序列欄位。

#### Scenario: 週平均為該週體重紀錄之平均
- **WHEN** 某一週內有體重紀錄 76.0 與 78.0
- **THEN** 該週 `avgBodyWeight` SHALL 為 77.0

#### Scenario: 無體重紀錄的週為 null
- **WHEN** 某一週內沒有任何體重紀錄
- **THEN** 該週 `avgBodyWeight` SHALL 為 `null`（而非 0）

### Requirement: Display Weekly Average Body Weight Line Overlay
首頁 12 週容積圖 SHALL 在既有的容積長條之上，疊加一條「每週平均體重」折線，形成雙軸圖：容積長條使用左軸（由 0 起算），體重折線使用右軸（依資料自動決定範圍，不從 0 起算）。`avgBodyWeight` 為 `null` 的週，折線 SHALL 於該處斷開、不繪製資料點與連線（不補 0、不內插）。圖表 SHALL 提供圖例以區分容積與體重兩個數列。使用者 hover 某一週時，明細 SHALL 一併顯示該週的容積與平均體重（該週無體重紀錄時 SHALL 顯示為無紀錄）。

#### Scenario: 疊加體重折線與雙軸
- **WHEN** 使用者開啟首頁
- **THEN** 12 週圖 SHALL 同時顯示容積長條（左軸）與每週平均體重折線（右軸），並提供可區分兩數列的圖例

#### Scenario: 缺值週折線斷開
- **WHEN** 12 週中某一週 `avgBodyWeight` 為 `null`
- **THEN** 體重折線 SHALL 在該週斷開（不畫點、不連線），而非以 0 呈現

#### Scenario: 互動同時顯示容積與體重
- **WHEN** 使用者 hover 或點擊某一週
- **THEN** 明細 SHALL 顯示該週日期範圍、容積，以及該週平均體重（若無紀錄則標示為無紀錄）

#### Scenario: 觸控裝置可點擊看明細
- **WHEN** 使用者於觸控裝置（LIFF 手機）點擊某一週
- **THEN** 系統 SHALL 顯示該週明細（不得僅依賴 hover）

#### Scenario: 右軸範圍受最小與最大跨度夾制
- **WHEN** 12 週非 `null` 的體重資料實際跨度小於 8kg
- **THEN** 體重右軸 SHALL 至少呈現約 8kg 的跨度（使 ±0.3kg 等級的波動不被放大成明顯趨勢），且右軸設定 SHALL NOT 影響左軸容積的尺度

#### Scenario: 全無體重資料時的空狀態
- **WHEN** 過去 12 週皆無任何體重紀錄
- **THEN** 圖表 SHALL 不繪製體重折線，並顯示引導訊息（提示記錄體重即可對照），而非留白或異常

### Requirement: Calculate Current Week Average Body Weight and Trend
系統 SHALL 提供「當週平均體重」＝當週（週一到週日）內所有體重紀錄 `bodyWeight` 的算術平均，供首頁右欄顯示；當週無體重紀錄時 SHALL 以無資料狀態呈現。系統 SHALL 以與容積相同的「當週 vs 過往完整週平均」方式，判定體重的變化方向與變化量（kg）：以當週平均體重對「所有完整週平均體重」相比，門檻採 ±0.3kg。體重趨勢 SHALL 以中性語意呈現（不使用好壞色，升與降皆不代表好或壞）。當週無體重紀錄、或無任何過往完整週時 SHALL 顯示為無趨勢。

#### Scenario: 當週平均體重為當週體重紀錄平均
- **WHEN** 當週內有體重紀錄 77.8 與 78.2
- **THEN** 當週平均體重 SHALL 為 78.0

#### Scenario: 體重趨勢採中性語意
- **WHEN** 當週平均體重高於過往完整週平均體重超過 0.3kg
- **THEN** 體重趨勢 chip SHALL 以中性樣式顯示上升方向與變化量（kg），且 SHALL 不套用好壞色

#### Scenario: 當週無體重紀錄
- **WHEN** 當週內沒有任何體重紀錄
- **THEN** 右欄當週平均體重 SHALL 以無資料狀態呈現
