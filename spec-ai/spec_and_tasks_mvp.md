# Personal Record MVP - Software Design & Implementation Document (SDD)

本文件為 Personal Record 專案 MVP 階段的「單一真實來源 (Single Source of Truth)」。它整合了產品行為 (Behavior)、資料結構 (Data)、後端架構 (Backend) 以及 AI 實作指南 (Implementation Tasks)。

---

## 1. 系統總覽與核心規範 (Constitution)

### 1.1 產品目標
提供一個專為重訓愛好者設計的進階數據追蹤工具，能精確分析特定反覆次數（如 3RM、5RM）的最高紀錄與最新趨勢，並結合體脂率進行疊合分析 (Liquid Glass 風格)。

### 1.2 前端技術棧與 UI 規範
*   **Framework**: Vue 3 + Vite + TypeScript (基於 `create-line-mini-app` Agent Skill 初始化)。
*   **Routing**: `vue-router`。
*   **State Management**: `pinia` (作為 Single Source of Truth，串接 API Factory 與 UI 元件)。
*   **Styling**: Vanilla CSS (Liquid Glass UI System, `#10b981` Emerald 主色調)。
*   **Charts**: Highcharts (支援雙 Y 軸、時間軸縮放與拖曳)。
*   **Apple HIG 規範落實**: 
    *   **雙層級儀表板**: 廣度預覽 (Sparklines) + 深度分析 (Hero section dual-axis chart)。
    *   **LINE Mini App 導覽限制 (Constraint)**: 由於 LIFF 環境缺乏原生瀏覽器導覽列，系統必須實作專屬的 **Bottom Tab Bar** (供主要模組切換) 以及 **自製 Top Navbar** (附帶 `< 返回` 按鈕供子頁面使用)，避免使用者迷失。

### 1.3 架構與儲存模式 (API Client)
全面採用 RESTful API 架構，前端透過 `VITE_STORAGE_MODE` 切換實作：
1.  **`local`**: 不發 HTTP Request，純 `localStorage` 存取。
2.  **`liff`**: 呼叫遠端 API，使用 LINE `liff.getIDToken()` 進行 JWT 驗證 (`Bearer <IDToken>`)。
*   **後端建議架構**: Node.js (Express/Fastify) + Firebase Cloud Functions + Firestore，完全抽離 Firebase Client SDK，擁抱 REST API。

---

## 2. 功能實作藍圖 (Implementation Playbooks)

### Feature 1: 首頁視覺化儀表板 (Dashboard)
*   **User Behavior**: 使用者進入首頁，上方看到多個動作的微型狀態膠囊 (Sparkline Pills)。下方有一個大型 Hero Chart，預設疊加顯示「訓練重量 (左軸 KG)」與「體脂率 (右軸橘色 %%)」。可透過選單切換要檢視的動作。
*   **Frontend Implementation**: 
    - 修改 `DashboardView.vue` 納入 `HistoryChart.vue` (雙 Y 軸設定)。
    - **動態選項 (Dynamic Loading)**: `FilterControls` 與 `Sparklines` 的清單不再 Hardcode，改由分析 Pinia 取得 `uniqueExercises` 動態陣列。
    - **連莊分析 (Streak)**: `DashboardView` 內部實作向後追朔之連續天數演算法，提供 `SparklineRow` 渲染進退步文字。
*   **Data Structure**: 需聚合 `TrainingRecord` (過濾出 RM 最高值) 與 `BodyMetricsRecord` 轉換為 Highcharts 的 `[timestamp, value]` 陣列。
*   **Technical Constraints**: 雙 Y 軸的刻度範圍跳動不能過於劇烈，否則會影響視覺連動性。
*   **AI Execution Tasks**:
    - [x] (已完成) 實作 Dashboard 雙 Y 軸 PoC UI。
    - [x] (已完成) UI Polish: 完善 Y 軸單位 (KG/%) 與色彩提示。

### Feature 2: 訓練動作的自定義與選單 (Program Input)
*   **User Behavior**: 使用者在紀錄訓練時，可以從「基礎預設清單 (Base List)」選擇動作。若找不到，可自行輸入文字並送出，系統會「記住」這個自訂動作供未來選用。
*   **Frontend Implementation**: 實作帶有 "Add New" 功能的 Dropdown 或 Autocomplete Component。
*   **Data Structure**: 
    - 一份靜態的 Base List (例如 `[{id: 'squat', name: 'Squat'}]`)。
    - 儲存層需維護一份 `UserCustomExercises: string[]`。
*   **Technical Constraints**: 需防範使用者輸入髒資料（例如前後多加空白），送出前需做 TRIM 與大小寫 Normalize。
*   **AI Execution Tasks**:
    - [ ] Task 2.1: 建立 Base Exercise List mock data。
    - [ ] Task 2.2: 開發 `SearchableDropdown` 或類似的填寫元件。
    - [ ] Task 2.3: 實作 LocalStorage 的儲存/讀取邏輯 (針對 Custom Exercises)。

### Feature 3: 全域導覽系統 (Navigation System)
*   **User Behavior**: 透過底部的 Tab Bar 快速切換 Dashboard (儀表板)、Record (紀錄Hub)、Settings (設定)。在特定深蹲紀錄頁面，能透過左上角回上一頁。
*   **Frontend Implementation**: 
    - 實作 `<BottomTabBar>` 元件，使用 `lucide-vue-next` icon，掛載於 `App.vue`。
    - 實作 `<TopNavBar>` 元件供子頁面引入。
*   **Technical Constraints**: Tab Bar 需避開 iOS 底部 Safe Area (Home Indicator)。
*   **AI Execution Tasks**:
    - [x] (已完成) 實作 Router 架構與基礎頁面 (Dashboard, Record, Settings)。
    - [x] (已完成) 實作 `BottomTabBar` UI 元件並加入 Safe Area padding。

### Feature 4: 統一資料服務層與 Pinia 串接 (Unified Data Layer)
*   **User Behavior**: 使用者對 App 的儲存位置感到無縫，系統依據環境變數切換，且圖表能即時反應 Program 頁面輸入的新紀錄。
*   **Frontend Implementation**:
    - 建立 `src/services/api.js` (Repository Pattern Factory)，統一對外提供 `getSessions()`, `addSession()` 等方法。
    - 依據環境變數 `VITE_STORAGE_MODE` 切換 `LocalService` (使用 localStorage) 或 `LIFFService` (使用 Axios + LINE JWT)。
    - **重點架構 (Store)**: 引入 `pinia` 建立 `sessionStore.js`。由 Store 統一呼叫 API，並將生資料轉換為 Highcharts 繪圖所需的格式 (透過 getters)。
*   **Data Structure**: 統一 Record Schema：
  ```json
  { "id": "uuid", "date": "YYYY-MM-DD", "exercise": "String", "weight": Number, "reps": Number, "createdAt": Timestamp }
  ```
*   **Technical Constraints**: 
    - 兩種 Storage Service 必須實作一模一樣的 Interface。
    - UI 層 (`DashboardView`, `ProgramView`) 嚴禁直接呼叫 API 或 localStorage，所有資料存取皆需經過 `sessionStore`。
*   **AI Execution Tasks**:
    - [ ] Task 4.1: 建立統一的 Record Schema 與 `.env` 設定。
    - [ ] Task 4.2: 實作 `api.js` (Repository Factory) 與 `LocalService` 底層實作。
    - [ ] Task 4.3: 安裝 `pinia` 並開發 `sessionStore.js` (包含 actions 與 chart-ready getters)。
    - [ ] Task 4.4: 重構 `ProgramView.vue`，將存檔動作改由 dispatch store action 處理。
    - [ ] Task 4.5: 重構 `DashboardView.vue`，讓 Highcharts 圖表綁定至 store 的 getters 即時渲染。

### Feature 6: Ultimate Hub Architecture (Record & Settings)
*   **User Behavior**:
    - **Tab 2 (Record)**：一站式輸入中心。頁面同時包含「體脂率 (Body Metrics)」卡片與「訓練動作 (Training)」卡片。體脂率一天限定儲存一次 (同日儲存則發動 Upsert 覆蓋)；訓練動作則可無限新增。
    - **Tab 3 (Settings)**：將先前的空白 Log 頁面改造為系統設定頁面。包含通知推播防怠惰開關。
*   **Frontend Implementation (Record View)**:
    - **UI Style**: 兩個卡片皆採用 ProgramView 現有的 `ios-list-group` CSS 結構。
    - **Chart Integration**: 修改 `DashboardView` 右側橘虛線，使其綁定全新的 `sessionStore.getChartSeriesForBodyFat(year, month)` 真實數據，具備動態過濾與防呆狀態。
*   **Frontend Implementation (Settings View)**:
    - 只需實作介面邏輯 (UI State) 讓使用者自訂三種防怠惰機制的開關，狀態先存回 `localStorage`：
      1. 連續 4 週未更換訓練動作。
      2. 連續 7 天未訓練。
      3. 連續 14 天未測量體脂。
*   **Data Structure**: 新增 `PR_BODY_METRICS` Storage Model，Schema 為 `[date: string, fatPercentage: number]`。新增 `PR_SETTINGS` 儲存 User Notification Preferences。
*   **AI Execution Tasks**:
    - [x] (已完成) Task 6.1: 擴充 `LocalService.js` 支援體脂率 CRUD (防呆 Upsert)。
    - [x] (已完成) Task 6.2: 擴充 `sessionStore.js` 新增 `bodyMetrics` 獲取與繪圖轉換函數。
    - [x] (已完成) Task 6.3: 修改 router 與 Tab Bar，將對應頁面正式命名為 Record 與 Settings。
    - [x] (已完成) Task 6.4: 改造 `RecordView.vue` 加入體脂率輸入區塊，並將主圖表連動至該真實資料。
    - [x] (已完成) Task 6.5: 開發 `SettingsView.vue` iOS Switch 介面，並記錄使用者通知偏好。

### Feature 7: 歷史紀錄管理 (History Data Management CRUD)
*   **User Behavior**:
    - **體脂率刪除**：使用者在 Record 頁面，如果選擇的日期已經有體脂紀錄，可以點擊 Delete 按鈕刪除該筆資料。
    - **訓練紀錄修改與刪除**：使用者可以在 Record 頁面下方的 Saved Sessions 清單中，點擊任何一筆訓練紀錄，進入 Session Detail 頁面。在此頁面中，可以針對單一 Set 的重量/次數進行修改，或者將該 Set 刪除。當該動作的所有 Set 都被刪除時，自動返回上一頁。
*   **Frontend Implementation**:
    - **RecordView**: 擴增 `deleteBodyMetric` 按鈕與狀態判斷 `currentFatRecord`。
    - **SessionDetailView**: 實作接收 `route.query.date` 與 `route.query.exercise`，動態從 `sessionStore` 過濾出需要編輯的 Sets，並提供 `updateSession` 與 `deleteSession` 的 UI 操作與本地副本 (Local Reactive Copy) 同步機制。
*   **Data Structure**: API (`api.js`) 與底層 (`LocalService.js`) 需實作真正的刪除與更新邏輯，不採用 Soft Delete 以保持 MVP 輕量。
*   **AI Execution Tasks**:
    - [x] (已完成) Task 7.1: 擴充 `LocalService.js` 與 `sessionStore.js` 支援 Session 的 Update 與 Delete。
    - [x] (已完成) Task 7.2: 擴充 `LocalService.js` 與 `sessionStore.js` 支援 BodyMetric 的 Delete。
    - [x] (已完成) Task 7.3: 開發 `SessionDetailView.vue` 單組編輯/刪除頁面。
    - [x] (已完成) Task 7.4: 於 `RecordView.vue` 實作體脂率刪除按鈕並串接訓練清單跳轉。

### Feature 8: 體重追蹤與圖表疊合 (Body Weight Tracking)
*   **User Behavior**:
    - **體重輸入**：在 Record 頁面的「Body Metrics」卡片中，除了體脂率外，新增「體重 (Body Weight, KG)」的輸入框。兩者可獨立或同時輸入，每日同樣發動 Upsert (覆蓋/新增)。
    - **圖表顯示**：Dashboard 會新增一條代表「體重」的線條。由於單位是 KG，它將與「訓練重量」共用**左側主 Y 軸 (Primary Y-axis)**，方便使用者直觀比對「絕對力量」與「自體重」的趨勢變化。
    - **數據判讀 (The X-ray Theory)**：
        - **黃金交叉 (大好)**：訓練重量 ↗、自身體重 ↘。代表增肌減脂成功，相對力量 (力量體重比) 大幅提升。
        - **死亡交叉 (大壞)**：訓練重量 ↘、自身體重 ↗。代表肌肉流失脂肪增加，或進入嚴重訓練過度 (Overtraining)，需警覺。
        - **平行發展 (正常)**：一同上升為標準增肌期 (Bulking)；一同下降為預期內的減脂期 (Cutting) 力量耗損。
*   **Frontend Implementation**:
    - **RecordView**: 擴充 `fatForm` 為 `bodyMetricsForm`，加入 `bodyWeight` 欄位。
    - **DashboardView**: 新增一條 Highcharts 曲線 (Series) 給體重，綁定左側 YAxis (0)。
*   **Data Structure**: 原 `PR_BODY_METRICS` Schema 擴充：由 `[date, fatPercentage]` 升級為 `[date: string, fatPercentage: number?, bodyWeight: number?]`。
*   **AI Execution Tasks**:
    - [x] (已完成) Task 8.1: 擴充 `sessionStore` 新增 `getChartSeriesForBodyWeight` getter。
    - [x] (已完成) Task 8.2: 更新 `DashboardView` 納入體重曲線 (Primary Y-axis)。
    - [x] (已完成) Task 8.3: 更新 `RecordView` 的 UI 結構，將表單擴增支援體重，並調整 Upsert Payload。

### Feature 9: 日夜間模式切換與全域主題套用 (Dark/Light Mode Theme Management)
*   **User Behavior**:
    - **自動跟隨系統**：預設狀態下，APP 主題會直接讀取使用者作業系統的日/夜間模式 (透過 CSS `prefers-color-scheme`)。
    - **自定義切換**：在 Settings 頁面新增「Auto Theme / Dark Mode」選項。若關閉自動主題，可選擇強制固定在 Light Mode 或 Dark Mode。
    - **圖表文字可視化**：Dashboard 的圖表文字與座標軸在 Light Mode 也不會變成全白隱形，支援動態讀取 CSS Variable 變色。
*   **Frontend Implementation**:
    - **CSS Architecture**: 於 `main.css` 定義 `:root` (預設亮色) 與 `@media (prefers-color-scheme: dark)` (系統暗色)，並透過 `:root[data-theme="light/dark"]` 提供最高選擇器權重以強制覆寫主題。
    - **Theme Injector**: 於 `App.vue` 載入時讀取 LocalStorage (`PR_SETTINGS.themeMode`)，若非 `auto` 則寫入 `<html data-theme="...">`；並監聽 `storage` 事件達成跨分頁同步。
    - **Highcharts Dynamic Colors**: 修改 `HistoryChart.vue`，捨棄 Hardcode 色碼，全面改用語法如 `color: 'var(--text-primary)'` 讓圖表隨主題變色。
*   **Data Structure**:
    - `PR_SETTINGS` LocalStorage JSON 新增屬性：`themeMode: 'auto' | 'light' | 'dark'`。
*   **AI Execution Tasks**:
    - [x] (已完成) Task 9.1: 重構 `main.css` 導入 `data-theme` 變數覆寫機制。
    - [x] (已完成) Task 9.2: 修改 `SettingsView.vue` 實作 Theme Toggle UI 並綁定設定。
    - [x] (已完成) Task 9.3: 於 `App.vue` 實作掛載時的 Theme Injector。
    - [x] (已完成) Task 9.4: 全面清洗圖表、導航列、標題漸層色碼，替換為 `--text-primary` 與 `--glass-border` 等動態變量。
