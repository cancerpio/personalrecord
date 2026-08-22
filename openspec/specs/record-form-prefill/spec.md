# Capability: Record Form Prefill

## Purpose
This capability prefills the training log form with the last recorded set of the selected
exercise, so the user only needs to adjust the numbers instead of retyping them for every set.

## Requirements

### Requirement: Prefill Last Set On Exercise Selection
當使用者在記錄表單選定一個訓練動作時，系統 SHALL 將該動作「最後一組」的重量與次數帶入表單的重量與次數欄位。當該動作沒有任何歷史紀錄時，系統 SHALL 清空這兩個欄位，使欄位永遠反映目前所選動作的狀態，不殘留其他動作的數值。

「最後一組」SHALL 為依時間排序的最後一筆紀錄，**包含當日已記錄的組**；SHALL NOT 取該動作的最重一組。此選擇是為了讓組間記錄能自然接續——上一組的數值才是下一組的合理起點。

#### Scenario: 帶入該動作的最後一組
- **WHEN** 使用者選定動作 `Squat`，且該動作最後一筆紀錄為 105kg × 5
- **THEN** 表單重量欄位 SHALL 為 105、次數欄位 SHALL 為 5

#### Scenario: 同日多組時取最後一組而非最重一組
- **WHEN** 當日 `Squat` 依序記錄了 100×5、120×1、90×8
- **THEN** 帶入的值 SHALL 為 90 與 8（最後一組），SHALL NOT 為 120 與 1（最重一組）

#### Scenario: 該動作無紀錄則清空欄位
- **WHEN** 使用者由已帶入數值的狀態切換到一個從未記錄過的動作
- **THEN** 重量與次數欄位 SHALL 被清空，SHALL NOT 保留前一個動作的數值

#### Scenario: 各動作互不干擾
- **WHEN** `Squat` 與 `Bench Press` 皆有歷史紀錄，使用者在兩者間切換
- **THEN** 每次帶入的值 SHALL 僅來自目前所選動作的紀錄

### Requirement: Determine The Last Set
系統 SHALL 依下列順序判定某動作的「最後一組」：

1. 先比較 `date`（`YYYY-MM-DD` 補零格式，字典序即時間序），較晚者為後。
2. `date` 相同時，比較 `createdAt`，較晚者為後。
3. 任一方缺少 `createdAt` 時，SHALL 退回陣列原順序，後加入者視為較新。

`createdAt` SHALL 先正規化為可比較的毫秒數再比較。此正規化為必要：local 儲存模式寫入的是 epoch 數字，後端儲存模式寫入的是 ISO 字串，兩種型別皆 SHALL 能正確排序。無法解析或不存在的 `createdAt` SHALL 視為缺值並套用第 3 條規則，SHALL NOT 拋出例外。

#### Scenario: 跨日取最新日期
- **WHEN** `Squat` 於 2026-08-19、2026-08-20、2026-08-22 皆有紀錄
- **THEN** 帶入的值 SHALL 來自 2026-08-22 的紀錄

#### Scenario: createdAt 為 ISO 字串時正確排序
- **WHEN** 同一日的紀錄其 `createdAt` 為 ISO 字串（後端儲存模式）
- **THEN** 系統 SHALL 依時間正確選出最後一組

#### Scenario: 缺少 createdAt 的舊資料
- **WHEN** 同一日的多筆紀錄皆無 `createdAt` 欄位
- **THEN** 系統 SHALL 以陣列原順序判定，取最後加入的一筆

#### Scenario: 同日部分紀錄缺 createdAt
- **WHEN** 同一日的紀錄中部分有 `createdAt`、部分沒有
- **THEN** 系統 SHALL 正常回傳一組結果，SHALL NOT 拋出例外

### Requirement: Prefill Triggers Only On Exercise Change
帶入行為 SHALL 僅在所選動作**改變**時觸發。變更日期、送出紀錄皆 SHALL NOT 觸發帶入，以維持既有的「送出後表單欄位保留、可連續送出同一動作的多組」行為。

頁面初次載入時所選動作為空，系統 SHALL NOT 因此清空任何欄位。所選動作為空字串時，系統 SHALL 視為無可帶入的紀錄。

#### Scenario: 送出後欄位保留
- **WHEN** 使用者送出一筆 `Squat` 105×5 的紀錄
- **THEN** 表單欄位 SHALL 維持 105 與 5，使用者可直接再次送出以記錄下一組

#### Scenario: 變更日期不觸發帶入
- **WHEN** 使用者在已填妥數值的狀態下變更表單日期
- **THEN** 重量與次數欄位 SHALL 維持不變

#### Scenario: 初次載入不清空欄位
- **WHEN** 使用者開啟記錄頁，尚未選擇任何動作
- **THEN** 系統 SHALL NOT 觸發帶入或清空行為

### Requirement: Exact Exercise Name Matching
動作名稱的比對 SHALL 採精確字串比對，SHALL NOT 進行 trim 或大小寫正規化。

備註（記錄目前已知取捨，非正規需求）：因此 `squat` 不會帶出 `Squat` 的歷史紀錄。名稱正規化牽涉既有資料是否一併收斂，且「動作變化通知」功能同樣需要判定「同一個動作」，將於該功能一併處理。

#### Scenario: 大小寫不同視為不同動作
- **WHEN** 歷史紀錄的動作名稱為 `Squat`，使用者輸入 `squat`
- **THEN** 系統 SHALL 視為無紀錄並清空欄位
