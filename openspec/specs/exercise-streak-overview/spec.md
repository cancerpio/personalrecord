# Capability: Exercise Streak Overview

## Purpose
本能力在 Dashboard 以單一表格呈現每個動作的近況，一列同時回答三個問題：
**目前連續幾週沒換過**、**最近 14 天做了多少**、**歷來最重多少**。
連續週數用於判斷哪些動作已經連續使用同一受力結構過久、該安排變化動作，
回答的是「現在還持續著嗎」，不是「歷史上曾經連續過幾週」。
本能力只顯示資訊，不發出通知。

（能力目錄名 `exercise-streak-overview` 沿用自僅有連續週數的初版，範圍已擴大。
目錄未改名是為了避免破壞既有參照，不代表範圍仍限於連續週數。）

## Requirements

### Requirement: Consecutive Week Count
系統 SHALL 為每個動作計算「連續週數」：自**當週**往回逐週檢查，
該週有紀錄則計入並將連續未命中歸零，該週無紀錄則累加連續未命中；
**連續**未命中達 2 次時 SHALL 停止。亦即每次最多容許連空一週，
SHALL NOT 解讀為「整段期間總共只能空一週」。

錨點 SHALL 為當週，SHALL NOT 為該動作最後有紀錄的那一週。
容許的空窗同樣適用於當週：當週未練但上一週有練時 SHALL 仍持續計數。
當週與上一週皆無紀錄時連續週數 SHALL 為 0——該動作的連續已中斷。

連續週數 SHALL 以 12 為上限；實際連續超過 12 週時 SHALL 回報 12。
12 週約為一季——到這個長度時「該安排變化動作」的訊號早已成立，
再往上累加不會改變任何決策，僅使數字寬度不可預期。

週邊界 SHALL 沿用與訓練容積相同的定義（週一起算）。
同一動作在同一週有多筆紀錄時 SHALL 只計為一週。

#### Scenario: 連續三週皆有紀錄
- **WHEN** 某動作於連續三個週各有紀錄
- **THEN** 連續週數 SHALL 為 3

#### Scenario: 中間連空一週仍算連續
- **WHEN** 某動作於第 1 週與第 3 週有紀錄，第 2 週沒有
- **THEN** 連續週數 SHALL 為 2，空週 SHALL NOT 計入

#### Scenario: 連空兩週即斷開
- **WHEN** 某動作於第 1 週與第 4 週有紀錄，第 2、3 週皆無
- **THEN** 連續週數 SHALL 為 1

#### Scenario: 每次最多連空一週而非整段只能空一週
- **WHEN** 某動作的週序列為「有、空、有、空、有」
- **THEN** 連續週數 SHALL 為 3

#### Scenario: 當週未練但上一週有練仍在持續
- **WHEN** 某動作連續三週有紀錄，最後一週為上一週，當週沒有練該動作
- **THEN** 連續週數 SHALL 為 3

#### Scenario: 停練超過容許空窗即歸零
- **WHEN** 某動作曾連續 5 週有紀錄，但最後一筆距當週已超過兩週
- **THEN** 連續週數 SHALL 為 0，SHALL NOT 回報歷史上的 5

#### Scenario: 連續週數上限為 12
- **WHEN** 某動作連續 17 週有紀錄且最後紀錄在當週
- **THEN** 連續週數 SHALL 為 12

#### Scenario: 同一週多次只算一週
- **WHEN** 某動作在同一週的三個不同日期各有紀錄
- **THEN** 連續週數 SHALL 為 1

### Requirement: Zero Streak Still Listed
所有有紀錄的動作 SHALL 納入結果，**包含連續週數為 0 者**。
連續中斷本身即為資訊，SHALL NOT 因歸零而將該動作自結果中移除——
使用者需要看到「這個動作停了」，而不是讓它無聲消失。

#### Scenario: 連續週數為 0 的動作仍顯示
- **WHEN** 某動作已超過容許空窗未練
- **THEN** 該動作 SHALL 出現在結果中，連續週數 SHALL 為 0

### Requirement: Recent Training Volume
每個動作 SHALL 提供最近訓練量兩個數值：**組數**與**總次數**。
統計範圍 SHALL 為**含今天在內往回 14 天的滾動視窗**。

一筆紀錄 SHALL 計為一組；總次數 SHALL 為該視窗內所有紀錄 `reps` 的總和。
`reps` 缺失或非數字時 SHALL 以 0 計入該筆，SHALL NOT 使總和成為 `NaN`。
視窗內沒有任何紀錄時，組數與總次數 SHALL 皆為 0。

此視窗 SHALL NOT 與連續週數的週界混用。兩者刻意不同，因為回答的問題不同：
週界（週一起算）回答「這一週有沒有練到」，滾動 14 天回答「最近兩週累積了多少」。

#### Scenario: 組數為紀錄筆數，總次數為 reps 總和
- **WHEN** 某動作在視窗內有三筆紀錄，`reps` 分別為 5、3、1
- **THEN** 組數 SHALL 為 3，總次數 SHALL 為 9

#### Scenario: 視窗含今天在內共 14 天
- **WHEN** 某動作在第 14 天（視窗起點）與第 15 天各有一筆紀錄
- **THEN** 僅第 14 天那筆 SHALL 計入

#### Scenario: 視窗內未練到
- **WHEN** 某動作最後一筆紀錄早於視窗起點
- **THEN** 組數與總次數 SHALL 皆為 0，該動作 SHALL 仍列在結果中

#### Scenario: reps 缺失不使總次數成為 NaN
- **WHEN** 視窗內某筆紀錄缺少 `reps` 或其值非數字
- **THEN** 該筆 SHALL 以 0 次計入，總次數 SHALL 為有效數值

### Requirement: All-Time Max Weight
每個動作 SHALL 提供**歷來最大重量**：該動作所有紀錄中 `weight` 的最大值。

此數值 SHALL NOT 受 14 天視窗或任何其他時間範圍限制——它回答的是
「這個動作我碰過最重多少」。`weight` 缺失、為空字串或非數字的紀錄 SHALL 被略過；
該動作完全沒有有效重量時 SHALL 回傳 `null`，畫面 SHALL 顯示為破折號而非 0。

**此數值與圖表的 `PR` 不是同一件事，SHALL NOT 混用名稱。**
圖表的 PR 為嚴格 1RM（`reps === 1` 的最大重量）；本數值不限 `reps`。
兩者刻意分開命名，避免同一個詞在兩處有不同意義。

#### Scenario: 最大重量不受視窗限制
- **WHEN** 某動作在視窗外有一筆 160 kg 的紀錄，視窗內最重為 120 kg
- **THEN** 最大重量 SHALL 為 160

#### Scenario: 略過無效重量
- **WHEN** 某動作的紀錄中有缺少 `weight` 或 `weight` 非數字者
- **THEN** 這些紀錄 SHALL 被略過，最大重量 SHALL 取自其餘有效紀錄

#### Scenario: 完全沒有有效重量
- **WHEN** 某動作的所有紀錄皆無有效 `weight`
- **THEN** 最大重量 SHALL 為 `null`

### Requirement: Result Shape And Ordering
每一列 SHALL 包含動作名稱、連續週數、最近 14 天的組數與總次數、歷來最大重量，
以及該動作**實際最後訓練日**（`YYYY-MM-DD`）。
最後訓練日 SHALL 為實際有紀錄的日期，SHALL NOT 為該週的週一。

最後訓練日 SHALL 用於排序，但 SHALL NOT 顯示於表格——四欄（動作、最近 14 天、
最重、連續）已是手機版面可容納的上限，而連續週數已隱含近期性。

結果 SHALL 以**最後訓練日由新到舊**為主要排序，使最近訓練過的動作優先呈現；
最後訓練日相同時 SHALL 依連續週數由大到小；兩者皆相同時 SHALL 依動作名稱字典序升冪，
以確保順序穩定。

最後訓練日 SHALL 壓過連續週數——使用者需要先看到自己最近在練什麼。
連續週數較高但較久沒練的動作 SHALL NOT 因數字較大而排到較新日期之前；
其顯著性由文字顏色承擔（見 Presentation Without Alerting）。

無任何紀錄時 SHALL 回傳空集合，SHALL NOT 拋出例外。
缺少 `date` 或 `exercise` 欄位的紀錄 SHALL 被略過，SHALL NOT 拋出例外。

#### Scenario: 最後訓練日為實際日期
- **WHEN** 某動作最後於週二有紀錄，而該週週一為另一日期
- **THEN** 回傳的最後訓練日 SHALL 為該週二的日期（用於排序，不顯示）

#### Scenario: 最近訓練過的動作排在前面
- **WHEN** 動作 A 連續 5 週但最後訓練日較舊，動作 B 連續 2 週但最後訓練日較新
- **THEN** 動作 B SHALL 排在動作 A 之前

#### Scenario: 同一最後訓練日時依連續週數
- **WHEN** 兩個動作的最後訓練日相同，連續週數分別為 2 與 1
- **THEN** 連續 2 週者 SHALL 排在前

#### Scenario: 日期與連續週數皆相同時依名稱
- **WHEN** 兩個動作的最後訓練日與連續週數皆相同
- **THEN** 兩者 SHALL 依名稱字典序升冪排列

#### Scenario: 無紀錄時回傳空集合
- **WHEN** 尚無任何訓練紀錄
- **THEN** SHALL 回傳空集合

#### Scenario: 略過欄位不全的紀錄
- **WHEN** 資料中含有缺少 `date` 或缺少 `exercise` 的紀錄
- **THEN** 系統 SHALL 略過該筆並正常回傳其餘結果，SHALL NOT 拋出例外

### Requirement: Result Count Limit
結果 SHALL 至多回傳 12 列：依前述排序取前 12 列，其餘 SHALL NOT 回傳。
由於排序以最後訓練日為主，保留的即為最近練過的 12 個動作。

動作名稱可自由輸入而無數量上限，清單長度必須有界，
否則久了會累積成一份無人閱讀的全動作清冊。

#### Scenario: 超過 12 個動作時只回傳最近的 12 個
- **WHEN** 資料中有 14 個動作，各自的最後訓練日互不相同
- **THEN** SHALL 回傳最後訓練日最新的 12 列

### Requirement: Presentation Without Alerting
本能力 SHALL 僅呈現資訊，SHALL NOT 發出通知、警報或需要使用者採取行動的提示。

表格 SHALL 為四欄：動作、最近 14 天（組數與總次數合併顯示）、最重、連續。
最近 14 天無紀錄時該欄 SHALL 顯示破折號而非「0組·0次」——
前者表示「這段期間沒碰」，後者會被誤讀為練了但沒記到數字。

連續週數 SHALL 以文字顏色分段呈現：4 週以上為警示色、3 週為琥珀色、
其餘為一般文字色。SHALL NOT 使用 pill、emoji、警示 icon 等警報語彙——
本能力不通知，使用警報符號卻無後續行動在語意上自相矛盾。

顏色門檻為視覺分段而非警報門檻，SHALL 可在不影響正確性的前提下調整。

#### Scenario: 高連續週數以警示色顯示
- **WHEN** 某動作連續週數為 6
- **THEN** 該數字 SHALL 以警示色顯示，且 SHALL NOT 伴隨任何警示 icon 或通知

### Requirement: Row Selection
每一**資料列** SHALL 可點擊。點擊時本能力 SHALL 發出「選定該動作」的訊號，
並 SHALL NOT 自行處理導覽、篩選或任何狀態變更——本能力維持純表現層，
後續行為由容器決定。**表頭列 SHALL NOT 可點擊。**

可點擊的提示 SHALL 僅以游標與按下態表達。
SHALL NOT 加入箭頭、icon 或其他指示符號——理由與 Presentation Without Alerting 相同：
本區塊不通知也不警示，加上指示符號會回到「有視覺暗示卻無對應語意」的問題。

容器（Dashboard）收到選定訊號時 SHALL 將該動作套用至 Performance Overview 圖表
並捲動至該區塊，且 SHALL NOT 一併變更既有的 RM 類型與年月篩選——
使用者若設定過篩選那是刻意的，代為清除屬於「系統做了使用者沒要求的決定」。
若該動作在目前篩選範圍內無資料，圖表 SHALL 顯示既有的空狀態；
此失敗 SHALL 為可見的，SHALL NOT 靜默發生。

#### Scenario: 點擊資料列選定該動作
- **WHEN** 使用者點擊某一資料列
- **THEN** 系統 SHALL 將 Performance Overview 圖表切換至該動作並捲動至該區塊

#### Scenario: 表頭不可點擊
- **WHEN** 使用者點擊表頭列
- **THEN** SHALL 無任何作用

#### Scenario: 選定動作不影響既有篩選
- **WHEN** 使用者已將篩選設為特定 RM 類型與年月，接著點擊某一資料列
- **THEN** RM 類型與年月 SHALL 維持不變，僅動作被切換

#### Scenario: 所選動作在篩選範圍內無資料
- **WHEN** 所點動作在目前的年月篩選範圍內沒有紀錄
- **THEN** 圖表 SHALL 顯示空狀態說明，SHALL NOT 靜默呈現空白

### Requirement: No Exercise Name Aliasing
本能力 SHALL 依 `exercise` 欄位的字串原樣分組，SHALL NOT 合併語意相同但字串不同的動作名稱。

備註（記錄已知取捨，非正規需求）：`Overhead Press` 與 `Barbell Overhead Press`
已知為同一動作，但在此會分成兩列顯示。這是刻意的——讓名稱分岔問題直接呈現在畫面上，
而非靜默影響計算結果。名稱一致性的處理屬於另一項獨立工作。

#### Scenario: 同義動作分開計算
- **WHEN** 資料中同時存在 `Overhead Press` 與 `Barbell Overhead Press`
- **THEN** 兩者 SHALL 各自成為獨立的一列
