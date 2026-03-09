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
*   **User Behavior**: 透過底部的 Tab Bar 快速切換 Dashboard、Program (紀錄)、Profile (設定)。在特定深蹲紀錄頁面，能透過左上角回上一頁。
*   **Frontend Implementation**: 
    - 實作 `<BottomTabBar>` 元件，使用 `lucide-vue-next` icon，掛載於 `App.vue`。
    - 實作 `<TopNavBar>` 元件供子頁面引入。
*   **Technical Constraints**: Tab Bar 需避開 iOS 底部 Safe Area (Home Indicator)。
*   **AI Execution Tasks**:
    - [ ] Task 3.1: 實作 Router 架構與基礎頁面 (Dashboard, Log, Settings)。
    - [ ] Task 3.2: 實作 `BottomTabBar` UI 元件並加入 Safe Area padding。

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

### Feature 5: Program View UI/UX Enhancement (iOS 16 Liquid Glass)
*   **User Behavior**: 使用者在記錄新訓練時，享有更大、更清晰、更現代的輸入體驗。點擊數字欄位時，自動彈出專屬的大型九宮格數字鍵盤。
*   **Frontend Implementation**:
    - **UI Style**: 採用 iOS 16 Settings App 風格的「Grouped List (清單群組)」排版。標題與欄位水平置放，搭配透明毛玻璃卡片底色與細緻分隔線。
    - **Input UX**: 數字輸入框屬性改為 `inputmode="decimal"` 以支援九宮格鍵盤。使用 CSS `::-webkit-inner-spin-button` 徹底隱藏預設的上下箭頭。
*   **Technical Constraints**: `inputmode="decimal"` 行為依賴 OS 虛擬鍵盤支援，但目前為 iOS/Android 雙平台標準。
*   **AI Execution Tasks**:
    - [x] (已完成) 調整 `ProgramView.vue` 佈局為 iOS 16 Grouped List。
    - [x] (已完成) 調整 `SearchableDropdown.vue` 樣式以適應新佈局 (右靠齊、去背)。
    - [x] (已完成) 隱藏 HTML 原生數字箭頭並實作 `inputmode="decimal"` 行為。
