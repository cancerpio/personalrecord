# Capability: Record Form Prefill

## Purpose
This capability prefills the training log form with the last recorded set of the selected
exercise, so the user only needs to adjust the numbers instead of retyping them for every set.
It also preselects the most recently logged exercise on first load, so opening the form already
shows the user's last set.

本能力同時規範記錄頁的**日期範圍**——該頁的心智模型是「正在編輯某一天」，
日期的變更會連帶影響帶入行為，兩者無法分開描述。

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

所選動作為空字串時，系統 SHALL 視為無可帶入的紀錄，且 SHALL NOT 因該空值清空任何欄位（帶入行為不使用 `immediate`）。

初次載入時所選動作 SHALL 由「Preselect Last Logged Exercise On First Load」決定；當該需求把動作填入表單時，本需求的「動作改變」條件成立，帶入行為 SHALL 隨之觸發——此為預期行為。

#### Scenario: 送出後欄位保留
- **WHEN** 使用者送出一筆 `Squat` 105×5 的紀錄
- **THEN** 表單欄位 SHALL 維持 105 與 5，使用者可直接再次送出以記錄下一組

#### Scenario: 變更日期不觸發帶入
- **WHEN** 使用者在已填妥數值的狀態下變更表單日期
- **THEN** 重量與次數欄位 SHALL 維持不變

#### Scenario: 尚無任何訓練紀錄時不觸發帶入或清空
- **WHEN** 使用者開啟記錄頁，且尚無任何訓練紀錄（無可預選的動作，所選動作維持為空）
- **THEN** 系統 SHALL NOT 觸發帶入或清空行為

#### Scenario: 預選動作會連帶觸發帶入
- **WHEN** 初次載入時系統依「Preselect Last Logged Exercise On First Load」把動作填入表單
- **THEN** 帶入行為 SHALL 被觸發，重量與次數 SHALL 為該動作最後一組的數值

### Requirement: Single Date Scope
記錄頁 SHALL 只有一個日期控制項。其值 SHALL 同時決定三件事：體重／體脂表單所編輯的日期、
訓練表單所記錄的日期，以及頁面下方「已存紀錄」所顯示的日期。
SHALL NOT 提供多個各自獨立的日期欄位。

變更該日期時：
- 重量與次數欄位 SHALL 維持不變（見 Prefill Triggers Only On Exercise Change）。
- 體重與體脂欄位 SHALL 更新為該日期已存的紀錄；該日期沒有紀錄時 SHALL 清空。

已知取捨（記錄既定行為，非正規需求）：若使用者在體重／體脂欄位輸入了尚未儲存的數值後
變更日期，該輸入會被覆寫或清空，且 SHALL NOT 另行提示。這是刻意選擇——本頁的模型是
「正在編輯某一天」，日期由使用者主動變更，欄位變化當場可見，且**不會產生錯誤資料**，
只會遺失可重打的輸入。

曾評估兩個替代方案並否決：
- 「欄位被改過就不自動帶入」會讓欄位顯示今天的數值、按鈕卻是 Update，
  按下去等於把今天的體重存進另一天——從遺失輸入惡化為產生錯誤資料。
- 「偵測未存修改並跳出確認」需要在 `RecordView` 加入有狀態的邏輯（dirty 判定、
  取消後還原日期、避免 watcher 遞迴），而該元件目前無任何自動化測試覆蓋（見 todo #10）。
  風險大於其所防止的損失。

日後若實際使用上反覆造成困擾，應重新評估確認提示方案，並以元件測試覆蓋。

#### Scenario: 變更日期時三個區塊同時更新
- **WHEN** 使用者變更頁面上唯一的日期控制項
- **THEN** 體重／體脂表單、訓練表單所記錄的日期、以及已存紀錄清單 SHALL 全部切換至該日期

#### Scenario: 變更日期時載入該日的體重紀錄
- **WHEN** 使用者將日期切換至一個已有體重紀錄的日期
- **THEN** 體重與體脂欄位 SHALL 顯示該日期的已存數值

#### Scenario: 該日期無體重紀錄時清空欄位
- **WHEN** 使用者將日期切換至一個沒有體重紀錄的日期
- **THEN** 體重與體脂欄位 SHALL 被清空

#### Scenario: 未儲存的體重輸入在變更日期時被捨棄
- **WHEN** 使用者於體重欄位輸入數值但尚未儲存，接著變更日期
- **THEN** 該輸入 SHALL 被該日期的紀錄覆寫或清空，SHALL NOT 出現確認提示

#### Scenario: 變更日期不影響訓練表單的重量與次數
- **WHEN** 使用者在已填妥重量與次數的狀態下變更日期
- **THEN** 重量與次數欄位 SHALL 維持不變

### Requirement: Preselect Last Logged Exercise On First Load
記錄表單初次載入時，若使用者尚未選定動作且已存在訓練紀錄，系統 SHALL 將「最近一筆訓練紀錄的動作名稱」填入所選動作欄位。「最近一筆」SHALL 依「Determine The Last Set」完全相同的排序規則判定，使預選的動作與帶入的組數必定來自同一筆紀錄。

`sessions` 為非同步載入，元件掛載當下可能仍為空陣列。系統 SHALL 等待資料到位後才套用預選，SHALL NOT 因掛載當下無資料即判定為無紀錄而放棄。

預選 SHALL 只套用一次。送出紀錄會使「最近一筆紀錄」改變，此時系統 SHALL NOT 再次覆寫所選動作，以維持「送出後欄位保留、可連續送出同一動作多組」的既有行為。使用者已自行選定動作時，系統 SHALL NOT 覆寫其選擇。

已知取捨：動作、重量、次數三者連同預設為今日的日期會使整張表單在開啟時即為可送出狀態，存在誤送的可能。此為刻意選擇——本應用為單人自用、誤記可刪除，額外要求一次確認點擊會抵銷本功能的價值。

#### Scenario: 初次載入預選上次記錄的動作
- **WHEN** 使用者開啟記錄頁，最近一筆訓練紀錄的動作為 `Bench Press`
- **THEN** 所選動作 SHALL 為 `Bench Press`，且重量與次數 SHALL 為該動作最後一組的數值

#### Scenario: 等待非同步資料載入後才預選
- **WHEN** 元件掛載當下 `sessions` 為空，稍後才載入完成
- **THEN** 系統 SHALL 於資料載入後才套用預選，SHALL NOT 因掛載當下無資料而永久放棄

#### Scenario: 送出後不再覆寫所選動作
- **WHEN** 使用者已被預選 `Squat` 並送出一筆紀錄，使最近一筆紀錄改變
- **THEN** 所選動作與欄位數值 SHALL 維持不變，使用者可直接再次送出

#### Scenario: 不覆寫使用者已選定的動作
- **WHEN** 使用者在 `sessions` 載入完成前已自行選定 `Deadlift`
- **THEN** 系統 SHALL NOT 以最近一筆紀錄的動作覆寫該選擇

#### Scenario: 尚無訓練紀錄時不預選
- **WHEN** 使用者開啟記錄頁，且尚無任何訓練紀錄
- **THEN** 所選動作 SHALL 維持為空

### Requirement: Exact Exercise Name Matching
動作名稱的比對 SHALL 採精確字串比對，SHALL NOT 進行 trim 或大小寫正規化。

備註（記錄目前已知取捨，非正規需求）：因此 `squat` 不會帶出 `Squat` 的歷史紀錄。名稱正規化牽涉既有資料是否一併收斂，且「動作變化通知」功能同樣需要判定「同一個動作」，將於該功能一併處理。

#### Scenario: 大小寫不同視為不同動作
- **WHEN** 歷史紀錄的動作名稱為 `Squat`，使用者輸入 `squat`
- **THEN** 系統 SHALL 視為無紀錄並清空欄位
