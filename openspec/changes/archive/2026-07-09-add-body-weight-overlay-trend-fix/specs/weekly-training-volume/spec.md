## MODIFIED Requirements

### Requirement: Calculate Historical Average and Trend
系統 SHALL 以「完整週對完整週」的方式判定趨勢，避免拿當週的部分加總（週一到當日）去和過去完整週相比。

定義：
- 「有訓練紀錄且非當週」的各週稱為「完整週」。
- 其中日期最新的一週為「上一完整週（last complete week）」。
- 其餘完整週為「前期各週（prior weeks）」；歷史平均 SHALL 為前期各週容積的平均。

系統 SHALL 以「上一完整週容積」對「前期各週平均」判定趨勢，門檻維持 ±5%：
- 上一完整週容積 > 平均 105% SHALL 判定為 "UP"（上升）。
- 上一完整週容積 < 平均 95% SHALL 判定為 "DOWN"（下降）。
- 介於 95%～105%（含）之間 SHALL 判定為 "STABLE"（持平）。

當僅有一個完整週（即無前期各週可構成平均）時，趨勢 SHALL 顯示為 "STABLE"（持平）。當完全沒有完整週時，維持既有的無資料處理。

當週的即時容積（週一到當日的部分加總）SHALL 不作為趨勢比較的基準值，僅作為卡片顯示用（見「Display Volume and Trend on Homepage」）。

#### Scenario: Trend is UP
- **WHEN** 上一完整週容積為 5000，前期各週平均為 4000
- **THEN** 趨勢分類 SHALL 為 "UP"

#### Scenario: Trend is DOWN
- **WHEN** 上一完整週容積為 3000，前期各週平均為 4000
- **THEN** 趨勢分類 SHALL 為 "DOWN"

#### Scenario: Trend is STABLE
- **WHEN** 上一完整週容積為 4100，前期各週平均為 4000
- **THEN** 趨勢分類 SHALL 為 "STABLE"

#### Scenario: 部分當週不影響趨勢
- **WHEN** 當週（進行中）到當日僅累積少量容積，但上一完整週容積高於前期各週平均 105%
- **THEN** 趨勢 SHALL 判定為 "UP"（不因當週部分加總偏低而變成 "DOWN"）

#### Scenario: 僅有一個完整週時持平
- **WHEN** 除了當週之外，僅存在一個有紀錄的完整週（無前期各週可平均）
- **THEN** 趨勢 SHALL 顯示為 "STABLE"（持平）

### Requirement: Display Volume and Trend on Homepage
首頁的容積卡片標頭 SHALL 以左右兩欄呈現兩項當週摘要：左欄為「當週訓練總容積」（週一到當日的即時加總），右欄為「當週平均體重」。每一欄 SHALL 各自顯示其大數字與一個趨勢指示 chip。

容積趨勢 chip SHALL 依「Calculate Historical Average and Trend」的分類（UP/DOWN/STABLE）呈現對應圖示與好壞語意色（上升為正向色）。由於趨勢基準為「上一完整週 vs 前期各週平均」而非畫面上的當週即時數字，卡片 SHALL 顯示一行共用的基準說明文字（例如「趨勢基準：上一完整週 vs 前期各週平均」）。

#### Scenario: Dashboard rendering
- **WHEN** 使用者開啟首頁
- **THEN** 容積卡片標頭 SHALL 顯示左欄「當週訓練總容積」與右欄「當週平均體重」，兩者各附趨勢 chip，並顯示一行共用的趨勢基準說明

#### Scenario: 徽章反映上一完整週
- **WHEN** 當週即時容積偏低但上一完整週高於前期平均
- **THEN** 容積趨勢 chip SHALL 顯示為上升，且卡片 SHALL 以基準說明文字標明比較對象為上一完整週

### Requirement: Display 16-Week Volume Bar Chart
首頁的容積卡片 SHALL 在標頭之下，以長條圖顯示過去 16 週的容積序列：每一週一根長條、其餘週以次要樣式呈現。**當週該根為「週一到當日」的部分累積值，SHALL 以「進行中」樣式（如 ghost／虛線外框）並輔以進行中標示呈現，明確表達其為未完成的部分加總，避免被誤讀為容積驟降。** 卡片 SHALL 顯示一條代表 16 週平均的參考線，並顯示 16 週平均的數值。使用者對某一週長條進行 hover 或點擊時，系統 SHALL 顯示該週明細。

#### Scenario: 當週柱以進行中樣式呈現
- **WHEN** 使用者開啟首頁，且當週僅累積到當日的部分容積
- **THEN** 當週長條 SHALL 以進行中樣式（ghost／虛線外框 + 進行中標示）與其他完整週區隔，而非畫成一般實柱

#### Scenario: 空白週顯示為零高度
- **WHEN** 某一週容積為 0
- **THEN** 該週 SHALL 顯示為零高度的空缺，而非從圖中略過

#### Scenario: 互動顯示單週明細
- **WHEN** 使用者 hover 或點擊某一週的長條
- **THEN** 系統 SHALL 顯示該週的日期範圍與容積數值

## ADDED Requirements

### Requirement: Provide Trailing 16-Week Average Body Weight
系統 SHALL 在最近 16 週的序列中，為每一週提供該週的平均體重 `avgBodyWeight`。每一週的平均體重 SHALL 為該週（週一到週日，沿用既有 UTC 週邊界）內所有體重紀錄 `bodyWeight` 的算術平均；**該週若無任何體重紀錄，`avgBodyWeight` SHALL 為 `null`**（不得補 0，不得內插）。此欄位 SHALL 以新增方式提供，不影響既有 16 週容積序列欄位。

#### Scenario: 週平均為該週體重紀錄之平均
- **WHEN** 某一週內有體重紀錄 76.0 與 78.0
- **THEN** 該週 `avgBodyWeight` SHALL 為 77.0

#### Scenario: 無體重紀錄的週為 null
- **WHEN** 某一週內沒有任何體重紀錄
- **THEN** 該週 `avgBodyWeight` SHALL 為 `null`（而非 0）

### Requirement: Display Weekly Average Body Weight Line Overlay
首頁 16 週容積圖 SHALL 在既有的容積長條之上，疊加一條「每週平均體重」折線，形成雙軸圖：容積長條使用左軸（由 0 起算），體重折線使用右軸（依資料自動決定範圍，不從 0 起算）。`avgBodyWeight` 為 `null` 的週，折線 SHALL 於該處斷開、不繪製資料點與連線（不補 0、不內插）。圖表 SHALL 提供圖例以區分容積與體重兩個數列。使用者 hover 某一週時，明細 SHALL 一併顯示該週的容積與平均體重（該週無體重紀錄時 SHALL 顯示為無紀錄）。

#### Scenario: 疊加體重折線與雙軸
- **WHEN** 使用者開啟首頁
- **THEN** 16 週圖 SHALL 同時顯示容積長條（左軸）與每週平均體重折線（右軸），並提供可區分兩數列的圖例

#### Scenario: 缺值週折線斷開
- **WHEN** 16 週中某一週 `avgBodyWeight` 為 `null`
- **THEN** 體重折線 SHALL 在該週斷開（不畫點、不連線），而非以 0 呈現

#### Scenario: 互動同時顯示容積與體重
- **WHEN** 使用者 hover 或點擊某一週
- **THEN** 明細 SHALL 顯示該週日期範圍、容積，以及該週平均體重（若無紀錄則標示為無紀錄）

#### Scenario: 觸控裝置可點擊看明細
- **WHEN** 使用者於觸控裝置（LIFF 手機）點擊某一週
- **THEN** 系統 SHALL 顯示該週明細（不得僅依賴 hover）

#### Scenario: 右軸範圍受最小與最大跨度夾制
- **WHEN** 16 週非 `null` 的體重資料實際跨度小於 8kg
- **THEN** 體重右軸 SHALL 至少呈現約 8kg 的跨度（使 ±0.3kg 等級的波動不被放大成明顯趨勢），且右軸設定 SHALL NOT 影響左軸容積的尺度

#### Scenario: 全無體重資料時的空狀態
- **WHEN** 過去 16 週皆無任何體重紀錄
- **THEN** 圖表 SHALL 不繪製體重折線，並顯示引導訊息（提示記錄體重即可對照），而非留白或異常

### Requirement: Calculate Current Week Average Body Weight and Trend
系統 SHALL 提供「當週平均體重」＝當週（週一到週日）內所有體重紀錄 `bodyWeight` 的算術平均，供首頁右欄顯示；當週無體重紀錄時 SHALL 以無資料狀態呈現。系統 SHALL 以與容積相同的「上一完整週 vs 前期各週平均」（2A）方式，判定體重的變化方向與變化量（kg）。體重趨勢 SHALL 以中性語意呈現（不使用好壞色，升與降皆不代表好或壞），且僅有一個完整週時 SHALL 顯示為持平。

#### Scenario: 當週平均體重為當週體重紀錄平均
- **WHEN** 當週內有體重紀錄 77.8 與 78.2
- **THEN** 當週平均體重 SHALL 為 78.0

#### Scenario: 體重趨勢採中性語意
- **WHEN** 上一完整週平均體重高於前期各週平均
- **THEN** 體重趨勢 chip SHALL 以中性樣式顯示上升方向與變化量（kg），且 SHALL 不套用好壞色

#### Scenario: 當週無體重紀錄
- **WHEN** 當週內沒有任何體重紀錄
- **THEN** 右欄當週平均體重 SHALL 以無資料狀態呈現
