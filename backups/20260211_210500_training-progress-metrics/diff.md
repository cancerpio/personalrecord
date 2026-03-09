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
