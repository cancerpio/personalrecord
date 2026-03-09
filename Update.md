# Update: LINE Mini App Chart Implementation

執行時間：2026-02-08T19:22:00+08:00
Feature Name：line-mini-app-chart

## 實際修改內容

### 新增專案結構 (Vue 3 + Vite)
- `package.json`: 設定 Vue 3, Highcharts, Vite 依賴。
- `vite.config.js`: Vite 設定檔。
- `index.html`: 入口 HTML，設定 viewport 與字型。

### 核心功能實作
- `src/main.js`: 應用程式入口，整合 HighchartsVue。
- `src/App.vue`: 主頁面邏輯，整合圖表、篩選器與狀態顯示。
- `src/mock/data.js`: 模擬 API 資料，支援依據年份、月份、動作、RM 類型產生隨機趨勢數據。

### UI 組件與設計
- `src/assets/main.css`: 實作 Apple iOS 16 Liquid Glass 風格 (Blur, Gradient, Fonts)。
  - **更新**：加入 `env(safe-area-inset)` 支援，解決瀏海與 Home Indicator 遮擋問題。
- `src/components/HistoryChart.vue`: 封裝 Highcharts，支援動態數據更新與 RWD。
- `src/components/FilterControls.vue`: 提供 RM 類型、動作、年月篩選介面。
- `src/components/CycleStatus.vue`: 顯示目前訓練週期 (線性/德州模式)。
  - **更新**：新增週期持續時間顯示 (例如 Week 4)。
- `src/components/SparklineRow.vue`: 顯示個別動作的迷你折線圖與趨勢分析。
  - **更新**：Layout 調整，將狀態標籤移至右側與圖表並排，符合使用者要求的簡潔排版。
- `src/App.vue`: 移除頂部 Avatar，優化 Header 空間。
- `src/components/CycleStatus.vue`: 調整週數顯示位置。
  - **更新**：Layout 調整為各占左右，將資訊分散，提高水平空間利用率與閱讀性。

### LINE Mini App Layout 規範遵從性
本次修改參考了 [LINE Developers Documentation](https://developers.line.biz/en/docs/line-mini-app/) 與 [LIFF Design Guidelines](https://developers.line.biz/en/docs/liff/design-guidelines/)：
1.  **Header Safe Area**: 移除 Avatar 可減少頂部視覺干擾，保留空間給 LINE 原生 Header (Service Name + Action Button)。
    -   規範指出 LINE Mini App 會有預設 Header，高度約 44px-50px (視 OS 而定)，Web 內容需避免與其重疊。
    -   透過 CSS `env(safe-area-inset-top)` 確保內容不會被瀏海或狀態列遮擋。
2.  **Touch Targets**: 將列表項目高度維持在 44px 以上 (SparklineRow padding + content)，符合 iOS Human Interface Guidelines 最小點擊區域 44x44pt 的建議。
3.  **Visual Hierarchy**: 將重要資訊 (狀態、趨勢) 右對齊，符合行動裝置閱讀習慣 (F-pattern 變體)，讓使用者快速掃描列表右側的變化。
4.  **Loading State UX**: 修正切換 RM Type 時 Sparkline 列表消失跳動的問題。改採用透明度變化 (Opacity Transition) 來提示載入中，保持版面穩定，符合 iOS 的流暢互動體驗 (Fluid Interfaces)。
5.  **Cycle Alerts & Visualization**: 
    -   新增週期警示：超過 4 週顯示 Warning (Orange)、超過 8 週顯示 Critical (Red)，以 iOS System Colors 呈現。
    -   新增 Current Cycle 封面圖 (已存為本地資源)，確保穩定顯示。
    -   列表加入動作圖示 (Iconography) 增強識別度。
6.  **CI/CD Pipeline**:
    -   新增 GitHub Actions Workflow (`.github/workflows/deploy.yml`) 自動部署至 GitHub Pages。
    -   設定 `vite.config.js` base path 為 `/personalrecord/`。
    -   更新 `README.md` 包含部署教學。
7.  **Chart Enhancements (Bodyweight & Relative Strength)**:
    -   **雙 Y 軸整合**：在 Performance Overview 圖表中加入體重 (Bodyweight) 作為灰色虛線背景參考，方便觀察體重對力量的影響。
    -   **相對強度圖表**：新增獨立圖表顯示「力量/體重比 (Ratio)」，排除體重因素檢視真實肌力進步。
    -   **說明文字**：在各圖表下方加入清楚的中文功能說明。
8.  **Navigation & Layout Structure**:
    -   **底部導航欄 (Bottom Tab Bar)**：實作 Charts / Program / Log 分頁切換，為未來功能擴充預留空間。
    -   **視圖重構**：將主畫面拆分為 `DashboardView`，並新增 `ProgramView` 與 `LogView` 佔位組件。

## 驗收指令

```bash
# 安裝依賴 (如果尚未安裝)
npm install

# 啟動開發伺服器
npm run dev
```

### 預期結果
1. 開啟瀏覽器 (通常為 http://localhost:5173)。
2. 首頁應顯示 "Training Log" 標題與 "Performance" 圖表。
3. 圖表預設顯示本月的 3RM 趨勢。
4. 點擊 "RM Type" (3RM/5RM/PR) 或切換 "Exercise"，圖表應在短暫載入後更新。
5. "Current Cycle" 卡片應隨機顯示 "Linear Mode" 或 "Texas Mode"。
6. 整體介面應呈現半透明毛玻璃質感。

---

## 本次調整：training-progress-metrics

### 實際修改的檔案
- `src/mock/data.js`
  - 將原本隨機產生的 Squat / Bench Press / Deadlift / Overhead Press + 體重資料，改為：
    - 僅保留 Squat 以及三種 RM 類型 (3RM / 5RM / PR)。
    - 新增固定 4 週的 Body Weight、Body Fat、VO2 max 資料。
    - 每週資料使用固定時間戳 (以天為單位)，符合 Dashboard 現有時間軸呈現。
    - Relative Strength 圖表改為只顯示「Squat / Body Weight」倍率。
    - Sparklines 只保留 Squat，一樣顯示 4 週趨勢。

- `Update.md`
  - 新增本次 Feature `training-progress-metrics` 的更新說明與驗收方式。

- `diff.md`
  - 新增對應的變更記錄與還原說明條目。

### 後續調整（單一 Y 軸 / 只保留 kg）

- `src/mock/data.js`
  - （第一階段）移除 Body Fat 與 VO2 max 資料與 series，僅輸出：
    - Squat (3RM / 5RM / PR=1RM)。
    - Body Weight（kg）。
  - （第二階段）依需求再度加入 Body Fat，並以 kg 顯示：
    - Body Fat：19, 21, 19, 17（視為 kg 數值）。
  - 所有 series（Squat / Body Weight / Body Fat）皆共用同一個 Y 軸 (`yAxis: 0`)，統一使用 kg 單位。

- `src/views/DashboardView.vue`
  - 將第一張圖表的 `HistoryChart` 從 `:dualAxis="true"` 改為單一 Y 軸（移除 `dualAxis` 設定），畫面上不再出現左右兩側不同刻度，並在說明文字中標註單位為 kg。
  - 將第二張圖改為顯示「體脂率 (Body Fat / Body Weight)」，標題更新為 Body Fat Percentage，說明文字不再重複描述基準敘述，Y 軸標籤改為 "Body Fat %"。

### 本階段調整（Bench Press 與 RM 排序）

- `src/mock/data.js`
  - 新增 Bench Press 固定 4 週資料（依 RM 類型分別為 3RM / 5RM / PR）：
    - Bench Press 3RM：75, 75, 75, 77.5
    - Bench Press 5RM：65, 65, 67.5, 67.5
    - Bench Press PR：85, 85, 85, 85
  - 新增 `benchSeries`，在 Performance Overview 圖表中與 Squat、Body Weight、Body Fat 一同顯示。
  - 調整 `RM_TYPES` 順序為：`['5RM', '3RM', 'PR']`，讓 RM 切換按鈕依「由弱到強」排列。

### 本階段調整（配色：群組相近 & iOS Style）

- `src/mock/data.js`
  - 調整動作類（Squat / Bench Press）顏色為接近的 iOS 藍色系：
    - Squat：`#0A84FF`（iOS System Blue）
    - Bench Press：`#5AC8FA`（iOS System Teal）
  - 調整身體指標類（Body Weight / Body Fat）為接近的灰色系：
    - Body Weight：`#8E8E93`（iOS System Gray）
    - Body Fat：`#AEAEB2`（iOS System Gray2）

### 本階段調整（Performance Overview 上方趨勢區塊）

- `src/mock/data.js`
  - 擴充 `sparklines` 資料，使 Sparklines 區塊同時顯示：
    - Squat（依 RM 切換：3RM / 5RM / PR）
    - Bench Press（依 RM 切換：3RM / 5RM / PR）
    - Body Weight（固定 79, 80, 80, 81，不受 RM 影響）
    - Body Fat（固定 19, 21, 19, 17，不受 RM 影響）
  - 每個項目皆提供 4 週資料與趨勢狀態（up / down / stable），確保在切換 RM 時，Squat / Bench 會正確反映不同 RM 的趨勢，而 Body Weight / Body Fat 保持穩定或緩變。

### 驗收補充

在原本驗收流程基礎上，再確認：

1. 主圖表的 Y 軸只剩下單一側刻度，代表 kg。
2. 圖上只會顯示：
   - Squat (依 RM 切換：3RM / 5RM / PR)。
   - Body Weight（79, 80, 80, 81）。
   - Body Fat（19, 21, 19, 17，以 kg 呈現）。
3. 不再出現 VO2 max 線條或圖例。
4. 第二張圖的折線代表體脂率 (Body Fat / Body Weight × 100)，Y 軸單位為 %。

### 驗收步驟（延續原專案啟動流程）

```bash
# 安裝依賴 (如果尚未安裝)
npm install

# 啟動開發伺服器
npm run dev
```

啟動後：
1. 進入 Dashboard（Charts / Performance 畫面）。
2. 主圖表只會顯示：
   - Squat (依目前 RM 切換：3RM / 5RM / PR)。
   - Body Weight / Body Fat / VO2 max 三條線在次 Y 軸。
3. 切換 RM 按鈕時：
   - Squat 曲線的 4 週數值依照下列規則更新：
     - 5RM：90, 90, 100, 105
     - 3RM：100, 105, 110, 110
     - PR (視為 1RM)：125, 130, 130, 130
   - Body Weight：79, 80, 80, 81（固定不隨 RM 改變）
   - Body Fat：23, 24, 21, 20（固定不隨 RM 改變）
   - VO2 max：40, 40, 39, 39（固定不隨 RM 改變）
4. 下方 Relative Strength 圖表應只顯示一條「Squat / Body Weight」倍率曲線。
5. Sparklines 區域只會有 Squat 一個項目，顯示 4 週趨勢。
