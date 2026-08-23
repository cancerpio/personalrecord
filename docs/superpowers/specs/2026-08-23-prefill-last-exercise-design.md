# 設計：初次載入時預選上次記錄的動作

日期：2026-08-23

> **補寫聲明**：本文件於實作完成後補寫，如實記錄當時的決策與被淘汰的選項。

## 目標

打開 Record 頁時，動作欄位自動帶入「上次記錄的動作」，
連帶觸發既有機制填入該動作的最後一組重量與次數，使用者確認一下即可送出。

## 背景

這是 [2026-08-22 選動作時帶入上次組次數](./2026-08-22-prefill-last-set-design.md) 的最後一哩。
前者解決「選完動作後不用打數字」，本功能解決「連動作都不用選」。
兩者合起來，打開記錄頁時表單已經是上次的最後一組。

單獨看本功能價值普通，接在前者後面價值才完整。

## 決策

### 1. 資料來源：從 `sessions` 的最後一筆取 `exercise`

淘汰的選項：用 `localStorage` 記住上次在下拉選單選過的動作。
好處是「選了但沒送出」也記得，代價是多出一份跟 `sessions` 不同步的狀態，
而且換裝置就失效。多一份狀態只換到一個邊緣情境，不划算。

採用 `sessions` 的好處：零新增儲存、零 schema 變更，
而且與「最後一組」共用同一套時間序判定，兩者永遠指向同一筆紀錄。

### 2. 判定邏輯：抽出共用 helper，不複製一份

`getLastSetForExercise` 已經把 `date` / `createdAt` / 缺欄位的排序規則釘死。
本功能需要的是「不限動作的最後一筆」，只差一個篩選條件。

因此抽出模組層級的 `findLatestSession(sessions, matches)`，
`matches` 為選填篩選條件，兩個 getter 共用。
淘汰的選項：在新 getter 裡複製一份排序邏輯——兩份規則遲早會分岔。

### 3. 觸發時機：watch `getLastLoggedExercise`，且只套用一次

`sessions` 是 `onMounted` 後才非同步取回，元件掛載當下仍是空陣列，
**因此不能在 `onMounted` 裡直接設定 `form.exercise`**。這是整個功能唯一需要小心的地方。

用 `watch` 等資料到位，並以 `exercisePrefilled` 旗標確保只套用一次：
送出紀錄會讓 `getLastLoggedExercise` 改變，但那時不得再覆寫欄位，
以維持「送出後欄位保留、可連續送出同一動作多組」的既有行為。

若使用者在資料回來前已自行選了動作，則不覆寫。

淘汰的選項：用 `watch` 的 stop handle 在 callback 裡自我停止。
配合 `immediate: true` 時會在 setup 階段落入 TDZ（stop handle 尚未賦值），
資料已在 store 裡（例如由其他分頁切回）就會拋錯。

### 4. 產品問題：接受整張表單被預填

動作 + 重量 + 次數全部預填、日期又預設今天，有可能手滑送出一筆不打算記的紀錄。

**選擇：接受。** 這個 app 是自己用、誤記可以刪掉，
多一次點擊反而毀掉整個功能的意義。

淘汰的選項：
- 只顯示「上次：Barbell Overhead Press 50×5」提示，點一下才套用——增加互動成本。
- 只在「今天已經有紀錄」時才自動帶入——規則變複雜，且隔天第一筆的情境正是價值所在。

## 與既有規格的衝突

`openspec/specs/record-form-prefill/spec.md` 的
`Requirement: Prefill Triggers Only On Exercise Change` 明文寫著
「頁面初次載入時所選動作為空，系統 SHALL NOT 因此清空任何欄位」，
並有對應 Scenario「初次載入不清空欄位」。

本功能讓初次載入時 `form.exercise` 從空字串變成某個動作名稱，
進而觸發既有 watch 帶入重量與次數——行為正是我們要的，但與該條規定直接牴觸。
**這是 `MODIFIED: record-form-prefill`，不是新增。spec 需一併修改。**

## 不受 #12 影響

動作名稱分岔問題（`todo_feature_202608.md` 項目 #12）不影響本功能：
本功能是把最後一筆紀錄的 `exercise` 字串直接取出再拿去精確比對，
那個字串本來就來自資料本身，一定命中。

## 改動範圍（3 檔）

### 1. `src/stores/sessionStore.js`
- 新增模組層級 `findLatestSession(sessions, matches)`。
- `getLastSetForExercise` 改為呼叫它（行為不變，由既有 9 個測試保護）。
- 新增 getter `getLastLoggedExercise`：回傳最後一筆紀錄的動作名稱，無紀錄回 `null`。

### 2. `src/views/RecordView.vue`
- `watch(() => sessionStore.getLastLoggedExercise, ...)` 配 `exercisePrefilled` 旗標。

### 3. `src/stores/sessionStore.test.js`
- 新增 4 個測試：時間序最後一筆、同日以 `createdAt` 判定、缺 `createdAt` 退回陣列順序、空陣列回 `null`。

RecordView 的 watch 為 glue code，前端元件測試基礎設施尚未建立
（`todo_feature_202608.md` 項目 #10），故不另寫元件測試。
