# Capability: Weekly Training Volume

## Purpose
This capability calculates and tracks the weekly training volume and provides comparison trends against a trailing 12 complete-week baseline on the user's dashboard.

## Requirements

### Requirement: Calculate Weekly Training Volume
系統 SHALL 計算當前日曆週（週一到週日）的訓練容積：對該週內所有訓練紀錄加總 `reps * weight`。

每一筆 session 紀錄代表「一組(set)」，欄位為 `{ date, exercise, weight, reps }`，資料模型中並無 `sets` 欄位；「幾組」已由「有幾筆紀錄」體現。因此容積公式為逐筆加總 `reps * weight`，不再乘以 `sets`。此定義天生支援同一動作各組使用不同重量的情況。

#### Scenario: Calculate volume with multiple sets
- **WHEN** the user has training sessions in the current week with (reps=5, weight=50), (reps=5, weight=30), and (reps=5, weight=20)
- **THEN** the weekly training volume SHALL be 500 (5*50 + 5*30 + 5*20)

### Requirement: Weekly Grouping Boundary
系統 SHALL 依每筆訓練紀錄的 `date` 欄位（`YYYY-MM-DD`），將其歸入一個「訓練週」；訓練週的範圍為**週一（起）至週日（迄）**。週日 SHALL 歸入「其前一個週一所開始的那一週」。

分組的輸入 SHALL 為日期字串本身，SHALL NOT 涉及一天之中的時刻。實作以 `Date.UTC` 進行日曆運算（`getMondayOfDate`），這是為了讓「哪一天是星期幾」不受執行環境時區影響而得到穩定答案，SHALL NOT 解讀為「以 UTC 判定週界」——同一個 `date` 在任何時區都會歸入同一週。

備註（記錄已修正的診斷，非正規需求）：先前版本記載「星期幾以 UTC 判定，UTC+8 使用者在週日深夜至週一凌晨的紀錄可能被歸入相鄰的一週」。經查該敘述有誤：分組不看時刻，不會發生此情形。真正受時區影響的是**記錄表單的預設日期**如何從當下時間取得今天（見 `src/utils/date.js` 的 `todayLocalISO`），該處原本用 UTC 取日期，已修正為本地日期。

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
系統 SHALL 以「當週即時總量」對「12 週基準」的方式判定趨勢。當週即時總量即為畫面上的當週訓練總容積（週一到當日的部分加總），也就是被比較的值本身。

定義：
- 「12 週視窗」SHALL 為自當週往回推的 12 個完整週（不含當週）。
- 「12 週基準（容積）」SHALL 為該視窗內各週容積的算術平均；**視窗內沒有訓練紀錄的週 SHALL 以 0 計入，分母固定為 12**（沒訓練就是 0，對容積而言是真值）。
- 容積與體重 SHALL 共用同一組 12 週視窗，使標頭 chip 與圖上基準線指向同一個定義。

此定義取代先前的「所有有紀錄之完整週平均」。變更理由（2026-08-23）：全期平均是不斷成長的視窗，每多記一週就更遲鈍，長期下來趨勢指示會退化成永遠「持平」，且不會產生任何錯誤徵兆；同時全期平均會把數月前不可比的訓練期混入「正常值」。

系統 SHALL 以「當週即時總量」對「12 週基準」判定趨勢，門檻維持 ±5%：
- 當週總量 > 平均 105% SHALL 判定為 "UP"（上升）。
- 當週總量 < 平均 95% SHALL 判定為 "DOWN"（下降）。
- 介於 95%～105%（含）之間 SHALL 判定為 "STABLE"（持平）。

當 12 週視窗內至少有一週存在訓練紀錄時，系統 SHALL 直接以當週總量與 12 週基準比較（即使視窗內僅一週有紀錄，也不再固定顯示持平）。當視窗內完全沒有任何訓練紀錄時，維持既有的無資料處理（有當週容積則顯示「首週訓練中」）。

由於當週為進行中的部分加總，週初可能因累積尚少而顯示為 "DOWN"；此為已知並接受的取捨。

#### Scenario: Trend is UP
- **WHEN** 當週即時總量為 5000，12 週基準為 4000
- **THEN** 趨勢分類 SHALL 為 "UP"

#### Scenario: Trend is DOWN
- **WHEN** 當週即時總量為 4200，12 週基準為 10000
- **THEN** 趨勢分類 SHALL 為 "DOWN"

#### Scenario: Trend is STABLE
- **WHEN** 當週即時總量為 10200，12 週基準為 10000（在 ±5% 內）
- **THEN** 趨勢分類 SHALL 為 "STABLE"

#### Scenario: 空白週以 0 計入且分母固定 12
- **WHEN** 12 週視窗內僅有一週有訓練紀錄、其容積為 12000
- **THEN** 12 週基準 SHALL 為 1000（12000 / 12），SHALL NOT 為 12000

#### Scenario: 當週容積不計入基準
- **WHEN** 當週即時總量為 999999，視窗內某完整週容積為 12000
- **THEN** 12 週基準 SHALL 為 1000，SHALL NOT 受當週容積影響

#### Scenario: 視窗外的紀錄不計入基準
- **WHEN** 某筆訓練紀錄落在當週往回第 13 週
- **THEN** 該紀錄 SHALL NOT 計入 12 週基準

#### Scenario: 視窗內沒有任何訓練紀錄
- **WHEN** 12 週視窗內無任何訓練紀錄、當週已有容積
- **THEN** 系統 SHALL 顯示「首週訓練中」

### Requirement: Display Volume and Trend on Homepage
首頁的容積卡片標頭 SHALL 以左右兩欄呈現兩項當週摘要：左欄為「當週訓練總容積」（週一到當日的即時加總），右欄為「當週平均體重」。每一欄 SHALL 各自顯示其大數字與一個趨勢指示 chip。

容積趨勢 chip SHALL 依「Calculate Historical Average and Trend」的分類（UP/DOWN/STABLE）呈現對應圖示與好壞語意色（上升為正向色）。趨勢基準為「當週總量 vs 12 週基準」，被比較的值即為畫面上的當週即時數字。

卡片 SHALL 顯示一行共用的基準說明文字，內容 SHALL 採**相對語意**而非方向語意，並 SHALL 標明體重門檻：

```
趨勢基準：本週 vs 過去 12 個完整週平均（不含本週）；體重未達 ±0.5 kg 視為持平
```

採相對語意的理由：與平均比較回答的是「相對這個區塊是高還是低」，而非「正在變重或變輕」。當視窗滾動使舊資料離開時，基準會自行改變而使用者的實際數值並未改變；若文案採方向語意，該變化會被誤讀為趨勢反轉。

容積趨勢 chip 的「持平」圖示 SHALL 維持水平線樣式——該 chip 併有「上升／下降／持平」文字標籤，不致與負號混淆。

#### Scenario: Dashboard rendering
- **WHEN** 使用者開啟首頁
- **THEN** 容積卡片標頭 SHALL 顯示左欄「當週訓練總容積」與右欄「當週平均體重」，兩者各附趨勢 chip，並顯示一行共用的趨勢基準說明

#### Scenario: 趨勢反映當週總量
- **WHEN** 當週即時總量高於 12 週基準 105%
- **THEN** 容積趨勢 chip SHALL 顯示為上升，且卡片 SHALL 以基準說明文字標明比較對象為過去 12 個完整週平均

### Requirement: Provide Trailing 12-Week Volume Series
系統 SHALL 提供最近 12 個日曆週（含當週，往回共 12 週）的訓練容積序列，供首頁圖表使用。每一週的容積為該週內所有訓練紀錄的 `reps * weight` 加總；**沒有任何紀錄的週 SHALL 以 0 表示且不得省略**，使序列固定為 12 筆、依時間由舊到新排序。

系統 SHALL 一併提供「12 週基準」，其定義 SHALL 與「Calculate Historical Average and Trend」完全相同（往回 12 個完整週、不含當週、空白週補 0、分母 12），使圖上基準線與標頭 chip 為同一個數字。SHALL NOT 使用「圖上這 12 根長條的平均」——那會把進行中的當週算進分母，等於拿當週與一個包含自己的平均比較，週初必然被自己拉低。

備註（記錄已知取捨，非正規需求）：因基準不含當週，基準線涵蓋的週（W-12～W-1）與圖上長條涵蓋的週（W-11～W0）相差一週。基準線標籤因此為「12 週基準」而非「平均」，避免被讀成圖上長條的平均。

#### Scenario: 序列固定 12 筆並補零
- **WHEN** 過去 12 週中僅有 3 個週有訓練紀錄
- **THEN** 回傳的序列仍 SHALL 為 12 筆，其中 9 筆容積為 0，且順序由最舊週到當週

#### Scenario: 平均值為 12 週基準且不含當週
- **WHEN** 視窗內僅有一週有訓練紀錄、其容積為 12000，當週容積為 999999
- **THEN** 系統 SHALL 回傳 1000（12000 / 12），且該值 SHALL 與標頭容積 chip 的基準同值

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
系統 SHALL 在最近 12 週的序列中，為每一週提供該週的平均體重 `avgBodyWeight`。每一週的平均體重 SHALL 為該週（週一到週日，沿用既有週邊界定義）內所有體重紀錄 `bodyWeight` 的算術平均；**該週若無任何體重紀錄，`avgBodyWeight` SHALL 為 `null`**（不得補 0，不得內插）。此欄位 SHALL 以新增方式提供，不影響既有 12 週容積序列欄位。

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
- **THEN** 體重右軸 SHALL 至少呈現約 8kg 的跨度（使 ±0.5kg 等級的波動不被放大成明顯趨勢），且右軸設定 SHALL NOT 影響左軸容積的尺度

#### Scenario: 全無體重資料時的空狀態
- **WHEN** 過去 12 週皆無任何體重紀錄
- **THEN** 圖表 SHALL 不繪製體重折線，並顯示引導訊息（提示記錄體重即可對照），而非留白或異常

### Requirement: Calculate Current Week Average Body Weight and Trend
系統 SHALL 提供「當週平均體重」＝當週（週一到週日）內所有體重紀錄 `bodyWeight` 的算術平均，供首頁右欄顯示；當週無體重紀錄時 SHALL 以無資料狀態呈現。

系統 SHALL 以當週平均體重對「12 週基準（體重）」相比，判定變化方向與變化量（kg）。

**12 週基準（體重）** SHALL 沿用與容積相同的 12 週視窗，但空白週的處理 SHALL 與容積不同：**沒有體重紀錄的週 SHALL 被跳過而非補 0**，分母為視窗內實際有紀錄的週數。理由：某週沒量體重不等於該週體重為 0 kg，補 0 會把基準拉到不可能的數值。

門檻 SHALL 為 ±0.5kg。此門檻取代先前的 ±0.3kg，理由（2026-08-23，依正式資料實測）：相鄰週的週平均體重變化中位數 0.27kg、平均 0.43kg，±0.3kg 會使近半數的正常波動踩過門檻，訊號被雜訊稀釋。

**差值 SHALL 先四捨五入到小數一位，再用該四捨五入後的值判定門檻**，使判定與畫面顯示永遠一致；`|差值| ≤ 0.5` SHALL 判定為持平。四捨五入後為零時 SHALL 正規化為 `0`，SHALL NOT 產生 `-0`。

體重趨勢 SHALL 以中性語意呈現（不使用好壞色，升與降皆不代表好或壞）。當週無體重紀錄、或 12 週視窗內無任何有體重紀錄的週時，SHALL 顯示為無趨勢。

#### Scenario: 當週平均體重為當週體重紀錄平均
- **WHEN** 當週內有體重紀錄 77.8 與 78.2
- **THEN** 當週平均體重 SHALL 為 78.0

#### Scenario: 體重趨勢採中性語意
- **WHEN** 當週平均體重高於 12 週基準超過 0.5kg
- **THEN** 體重趨勢 chip SHALL 以中性樣式顯示上升方向與變化量（kg），且 SHALL 不套用好壞色

#### Scenario: 空白週跳過而非補 0
- **WHEN** 12 週視窗內僅有一週有體重紀錄、該週平均為 76.0
- **THEN** 12 週基準（體重）SHALL 為 76.0，SHALL NOT 為 76.0 / 12

#### Scenario: 四捨五入後恰為門檻值視為持平
- **WHEN** 當週平均體重與 12 週基準的差值四捨五入到小數一位後為 0.5
- **THEN** 趨勢 SHALL 判定為持平，且顯示值 SHALL 為 `+0.5`

#### Scenario: 四捨五入後為零不得顯示負號
- **WHEN** 當週平均體重與 12 週基準的差值為 -0.04
- **THEN** 差值 SHALL 為 `0`（非 `-0`）、趨勢 SHALL 為持平，且顯示 SHALL 為 `0.0` 而非 `-0.0`

#### Scenario: 當週無體重紀錄
- **WHEN** 當週內沒有任何體重紀錄
- **THEN** 右欄當週平均體重 SHALL 以無資料狀態呈現

### Requirement: Display Body Weight Trend Chip
體重趨勢 chip SHALL 以帶正負號的數值呈現差值，SHALL NOT 僅以圖示表達方向。符號 SHALL 依四捨五入後的值決定，與「Calculate Current Week Average Body Weight and Trend」判定門檻所用的值相同。

「持平」狀態的圖示 SHALL 為實心圓點，SHALL NOT 使用水平線。變更理由（2026-08-23）：水平線圖示與負號在視覺上無法區分，與被 `Math.abs()` 去除正負號的數值並排時，`+0.27kg` 會被讀成 `-0.3kg`，語意完全相反。

chip 的三種狀態：

| 狀態 | 條件（r ＝四捨五入後的差值） | 圖示 | 顯示 |
|---|---|---|---|
| 高於基準 | `r > 0.5` | 上升箭頭 | `+0.6 kg` |
| 低於基準 | `r < -0.5` | 下降箭頭 | `-0.6 kg` |
| 門檻內 | `-0.5 ≤ r ≤ 0.5` | 實心圓點 | `+0.1 kg` |
| 無趨勢 | 無可比基準 | 無 | `—` |

#### Scenario: 持平時以圓點而非水平線呈現
- **WHEN** 差值四捨五入後為 0.1（在門檻內）
- **THEN** chip 圖示 SHALL 為實心圓點，且顯示 SHALL 為 `+0.1 kg`

#### Scenario: 高於基準時顯示正號
- **WHEN** 差值四捨五入後為 0.6
- **THEN** chip 顯示 SHALL 為 `+0.6 kg`，SHALL NOT 為 `0.6 kg`

#### Scenario: 無可比基準時顯示無趨勢
- **WHEN** 12 週視窗內沒有任何有體重紀錄的週
- **THEN** chip SHALL 顯示 `—`，且 SHALL NOT 顯示任何方向圖示
