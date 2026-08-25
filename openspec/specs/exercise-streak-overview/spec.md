# Capability: Exercise Streak Overview

## Purpose
本能力在 Dashboard 顯示每個動作「目前連續幾週沒換過」，讓使用者判斷哪些動作已經
連續使用同一受力結構過久、該安排變化動作。回答的是「現在還持續著嗎」，
不是「歷史上曾經連續過幾週」。本能力只顯示資訊，不發出通知。

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

### Requirement: Result Shape And Ordering
每一列 SHALL 包含動作名稱、連續週數，以及該動作**實際最後訓練日**（`YYYY-MM-DD`）。
最後訓練日 SHALL 為實際有紀錄的日期，SHALL NOT 為該週的週一——
使用者看到的應是自己實際去訓練的那天。

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
- **THEN** 回傳的最後訓練日 SHALL 為該週二的日期

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
