# Feature line-mini-app-chart 變更記錄

執行時間：2026-02-08T19:22:00+08:00
Feature Name：line-mini-app-chart
調整類型：新增功能
備份目錄：.cursor/backups/20260208_192000_line-mini-app-chart/

## 變更摘要

### 新增的檔案
- package.json
- package-lock.json
- vite.config.js
- index.html
- src/main.js
- src/App.vue
- src/assets/main.css
- src/mock/data.js
- src/components/HistoryChart.vue
- src/components/FilterControls.vue
- src/components/CycleStatus.vue
- Update.md

- src/components/SparklineRow.vue
  - 說明：顯示個別動作迷你折線圖的全新組件。
- src/assets/images/damn.jpg
- src/assets/images/bokuwa.jpg
  - 說明：新增專輯封面圖片資源 (用於 Cycle Status)。

- .github/workflows/deploy.yml
  - 說明：新增 GitHub Actions CI/CD 流程設定檔。
- README.md
  - 說明：新增部署說明文件。

### 修改的檔案
- vite.config.js
  - 變更類型：修改
  - 變更說明：新增 base path 設定以支援 GitHub Pages 部署。
- src/App.vue
  - 變更類型：修改
  - 變更說明：實作雙圖表佈局 (Performance & Relative Strength)，整合新數據流。
- src/components/HistoryChart.vue
  - 變更類型：修改
  - 變更說明：支援雙 Y 軸 (Dual Axis) 與自定義 Y 軸標籤 (Ratio)，增強圖表顯示彈性。
- src/mock/data.js
  - 變更類型：修改
  - 變更說明：新增體重數據生成邏輯，並計算相對強度 (Ratio) 序列。
- src/views/DashboardView.vue
  - 說明：(新增) 從 App.vue 拆分出的儀表板視圖。
- src/views/ProgramView.vue
  - 說明：(新增) 課表資訊頁面 (施工中)。
- src/views/LogView.vue
  - 說明：(新增) 訓練紀錄輸入頁面 (施工中)。

### 修改的檔案
- vite.config.js
  - 變更類型：修改
  - 變更說明：新增 base path 設定以支援 GitHub Pages 部署。
- src/App.vue
  - 變更類型：修改(重構)
  - 變更說明：改為導航容器 (Navigation Container)，負責顯示底部導航欄與切換視圖。
- src/components/HistoryChart.vue
  - 變更類型：修改
  - 變更說明：新增 weeks prop 與 UI 顯示；整合專輯封面與 Alert 狀態。
- src/components/SparklineRow.vue
  - 變更類型：修改
  - 變更說明：新增動作圖示顯示。
- src/mock/data.js
  - 變更類型：修改
  - 變更說明：模擬 API 回傳增加 sparklines 與 cycleWeeks 欄位；加入 Icon 與更長的週期範圍。
- src/assets/main.css
  - 變更類型：修改
  - 變更說明：新增 CSS env() 安全區域設定，支援 iOS 裝置的 Safe Area。
- index.html
  - 變更類型：修改
  - 變更說明：新增 viewport-fit=cover meta 標籤。

## 還原方式

### 步驟 1：刪除新增的檔案

```bash
rm package.json package-lock.json vite.config.js index.html
rm -rf src
rm Update.md diff.md
```

### 步驟 2：恢復備份檔案 (預防性)

```bash
cp .cursor/backups/20260208_192000_line-mini-app-chart/README.md ./README.md
cp .cursor/backups/20260208_192000_line-mini-app-chart/.gitignore ./.gitignore
```

### 步驟 3：清理

```bash
rm -rf node_modules
# 如果不需要備份目錄
# rm -rf .cursor/backups/20260208_192000_line-mini-app-chart/
```

---

# Feature training-progress-metrics 變更記錄

執行時間：2026-02-11T21:05:00+08:00
Feature Name：training-progress-metrics
調整類型：調整功能
備份目錄：./backups/20260211_210500_training-progress-metrics/

## 變更摘要（第一階段）

### 修改的檔案
- src/mock/data.js
  - 變更類型：修改
  - 變更說明：
    - 主圖表改為只顯示 Squat (依 RM 類型切換) + Body Weight + Body Fat + VO2 max 四種指標。
    - 資料改為固定 4 週時間點與固定數值，不再使用隨機產生。
    - Relative Strength 圖表改為只顯示「Squat / Body Weight」倍率。
    - Sparklines 只保留 Squat 一個項目。
  - 備份位置：`./backups/20260211_210500_training-progress-metrics/src/mock/data.js`

- Update.md
  - 變更類型：修改
  - 變更說明：新增本次 training-progress-metrics 更新摘要與驗收步驟。
  - 備份位置：`./backups/20260211_210500_training-progress-metrics/Update.md`

- diff.md
  - 變更類型：修改
  - 變更說明：新增 training-progress-metrics Feature 的變更記錄與還原說明。
  - 備份位置：`./backups/20260211_210500_training-progress-metrics/diff.md`

## 還原方式（第一階段）

### 步驟 1：恢復備份檔案

```bash
cp ./backups/20260211_210500_training-progress-metrics/src/mock/data.js src/mock/data.js
cp ./backups/20260211_210500_training-progress-metrics/Update.md Update.md
cp ./backups/20260211_210500_training-progress-metrics/diff.md diff.md
```

### 步驟 2：驗證

```bash
npm run dev
```

確認 Dashboard 圖表恢復到本次調整前的狀態。

---

## 變更摘要（第二階段：單一 Y 軸 / 移除 VO2 max & Body Fat）

執行時間：2026-02-11T21:15:00+08:00
備份目錄：./backups/20260211_211500_training-progress-metrics/

### 修改的檔案

- src/mock/data.js
  - 變更類型：修改
  - 變更說明：
    - 移除 Body Fat 與 VO2 max 的資料與 series。
    - 只保留 Squat (3RM / 5RM / PR=1RM) 與 Body Weight（kg）。
    - 將 Body Weight 的 `yAxis` 調整為與 Squat 相同的主軸 (`yAxis: 0`)，統一以 kg 顯示。
  - 備份位置：`./backups/20260211_211500_training-progress-metrics/src/mock/data.js`

- src/views/DashboardView.vue
  - 變更類型：修改
  - 變更說明：
    - 將 `HistoryChart` 的 `:dualAxis="true"` 改為使用單一 Y 軸（移除 `dualAxis` 設定）。
  - 備份位置：`./backups/20260211_211500_training-progress-metrics/src/views/DashboardView.vue`

- Update.md
  - 變更類型：修改
  - 變更說明：
    - 補充說明本階段移除 Body Fat / VO2 max 與單一 Y 軸 (kg) 的調整內容與驗收步驟。
  - 備份位置：`./backups/20260211_211500_training-progress-metrics/Update.md`

- diff.md
  - 變更類型：修改
  - 變更說明：
    - 新增本階段的變更摘要與還原方式。
  - 備份位置：`./backups/20260211_211500_training-progress-metrics/diff.md`

## 還原方式（第二階段）

### 步驟 1：恢復備份檔案

```bash
cp ./backups/20260211_211500_training-progress-metrics/src/mock/data.js src/mock/data.js
cp ./backups/20260211_211500_training-progress-metrics/src/views/DashboardView.vue src/views/DashboardView.vue
cp ./backups/20260211_211500_training-progress-metrics/Update.md Update.md
cp ./backups/20260211_211500_training-progress-metrics/diff.md diff.md
```

### 步驟 2：驗證

```bash
npm run dev
```

確認 Dashboard 圖表為單一 Y 軸（kg），且只顯示 Squat 與 Body Weight，沒有 Body Fat 與 VO2 max。

---

## 變更摘要（第三階段：Body Fat 以 kg 顯示）

執行時間：2026-02-11T21:25:00+08:00  
備份目錄：./backups/20260211_212500_training-progress-metrics/

### 修改的檔案

- src/mock/data.js
  - 變更類型：修改
  - 變更說明：
    - 新增 Body Fat 的 4 週資料（19, 21, 19, 17），並以 kg 數值呈現。
    - 新增 `bodyFatSeries`，與 Squat、Body Weight 共用同一個 Y 軸 (`yAxis: 0`，kg)。
  - 備份位置：`./backups/20260211_212500_training-progress-metrics/src/mock/data.js`

- Update.md
  - 變更類型：修改
  - 變更說明：
    - 補充 Body Fat 以 kg 顯示的說明與驗收預期。
  - 備份位置：`./backups/20260211_212500_training-progress-metrics/Update.md`

- diff.md
  - 變更類型：修改
  - 變更說明：
    - 新增第三階段的變更摘要與還原方式。
  - 備份位置：`./backups/20260211_212500_training-progress-metrics/diff.md`

## 還原方式（第三階段）

### 步驟 1：恢復備份檔案

```bash
cp ./backups/20260211_212500_training-progress-metrics/src/mock/data.js src/mock/data.js
cp ./backups/20260211_212500_training-progress-metrics/Update.md Update.md
cp ./backups/20260211_212500_training-progress-metrics/diff.md diff.md
```

### 步驟 2：驗證

```bash
npm run dev
```

確認 Dashboard 圖表仍為單一 Y 軸（kg），且顯示 Squat、Body Weight、Body Fat 三條線（全部以 kg 呈現），無 VO2 max。
