# Capability: Exercise Streak Overview

## Purpose
本能力在 Dashboard 顯示每個動作「連續幾週沒換過」，讓使用者判斷哪些動作已經
連續使用同一受力結構過久、該安排變化動作。本能力只顯示資訊，不發出通知。

## Requirements

### Requirement: Consecutive Week Count
系統 SHALL 為每個動作計算「連續週數」：自該動作**最後有紀錄的那一週**往回逐週檢查，
該週有紀錄則計入並將連續未命中歸零，該週無紀錄則累加連續未命中；
**連續**未命中達 2 次時 SHALL 停止。亦即每次最多容許連空一週，
SHALL NOT 解讀為「整段期間總共只能空一週」。

錨點 SHALL 為該動作最後有紀錄的那一週，SHALL NOT 為當週。
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

#### Scenario: 錨點為最後練到的那一週
- **WHEN** 某動作連續三週有紀錄，但當週沒有練該動作
- **THEN** 連續週數 SHALL 為 3，SHALL NOT 因當週無紀錄而為 0

#### Scenario: 同一週多次只算一週
- **WHEN** 某動作在同一週的三個不同日期各有紀錄
- **THEN** 連續週數 SHALL 為 1

### Requirement: Display Window
顯示範圍 SHALL 為自當週往回共 12 個週（**含當週**）。動作的最後紀錄落在此視窗內者
SHALL 顯示，落在視窗外者 SHALL NOT 顯示。

視窗 SHALL 僅決定動作是否顯示，SHALL NOT 限制連續週數的計算範圍——
連續週數可往回數超過 12 週。視窗回答「這個動作還在練嗎」，
連續週數回答「它已經連續多久沒換」。

#### Scenario: 視窗外的動作不顯示
- **WHEN** 某動作的最後紀錄早於視窗起點
- **THEN** 該動作 SHALL NOT 出現在結果中

#### Scenario: 視窗起點那一週算在視窗內
- **WHEN** 某動作的最後紀錄落在視窗起點那一週
- **THEN** 該動作 SHALL 出現在結果中

#### Scenario: 連續週數可超過視窗長度
- **WHEN** 某動作連續 17 週有紀錄且最後紀錄在當週
- **THEN** 連續週數 SHALL 為 17，SHALL NOT 被截斷為 12

### Requirement: Result Shape And Ordering
每一列 SHALL 包含動作名稱、連續週數，以及該動作**實際最後訓練日**（`YYYY-MM-DD`）。
最後訓練日 SHALL 為實際有紀錄的日期，SHALL NOT 為該週的週一——
使用者看到的應是自己實際去訓練的那天。

結果 SHALL 依連續週數由大到小排序；連續週數相同時 SHALL 依動作名稱字典序升冪，
以確保順序穩定。

無任何紀錄時 SHALL 回傳空集合，SHALL NOT 拋出例外。
缺少 `date` 或 `exercise` 欄位的紀錄 SHALL 被略過，SHALL NOT 拋出例外。

#### Scenario: 最後訓練日為實際日期
- **WHEN** 某動作最後於週二有紀錄，而該週週一為另一日期
- **THEN** 回傳的最後訓練日 SHALL 為該週二的日期

#### Scenario: 依連續週數排序，同分依名稱
- **WHEN** 存在連續週數為 2、1、1 的三個動作
- **THEN** 連續 2 週者 SHALL 排在最前，其餘兩者 SHALL 依名稱字典序排列

#### Scenario: 無紀錄時回傳空集合
- **WHEN** 尚無任何訓練紀錄
- **THEN** SHALL 回傳空集合

#### Scenario: 略過欄位不全的紀錄
- **WHEN** 資料中含有缺少 `date` 或缺少 `exercise` 的紀錄
- **THEN** 系統 SHALL 略過該筆並正常回傳其餘結果，SHALL NOT 拋出例外

### Requirement: Presentation Without Alerting
本能力 SHALL 僅呈現資訊，SHALL NOT 發出通知、警報或需要使用者採取行動的提示。

連續週數 SHALL 以文字顏色分段呈現：4 週以上為警示色、3 週為琥珀色、
其餘為一般文字色。SHALL NOT 使用 pill、emoji、警示 icon 等警報語彙——
本能力不通知，使用警報符號卻無後續行動在語意上自相矛盾。

顏色門檻為視覺分段而非警報門檻，SHALL 可在不影響正確性的前提下調整。

#### Scenario: 高連續週數以警示色顯示
- **WHEN** 某動作連續週數為 6
- **THEN** 該數字 SHALL 以警示色顯示，且 SHALL NOT 伴隨任何警示 icon 或通知

### Requirement: No Exercise Name Aliasing
本能力 SHALL 依 `exercise` 欄位的字串原樣分組，SHALL NOT 合併語意相同但字串不同的動作名稱。

備註（記錄已知取捨，非正規需求）：`Overhead Press` 與 `Barbell Overhead Press`
已知為同一動作，但在此會分成兩列顯示。這是刻意的——讓名稱分岔問題直接呈現在畫面上，
而非靜默影響計算結果。名稱一致性的處理屬於另一項獨立工作。

#### Scenario: 同義動作分開計算
- **WHEN** 資料中同時存在 `Overhead Press` 與 `Barbell Overhead Press`
- **THEN** 兩者 SHALL 各自成為獨立的一列
