# 設計：Dashboard 容積圖由 16 週改為 12 週

日期：2026-07-10

## 目標

將首頁 Dashboard 的容積長條圖（含每週平均體重折線）顯示的 trailing 視窗，
從「最近 16 個日曆週（含當週）」改為「最近 12 個日曆週（含當週）」。

## 行為變更

唯一的實質變更是 trailing 視窗長度：

- 序列固定長度由 16 → 12。
- 平均容積改為除以 12。

其餘規則全部維持不變：

- 沒有任何紀錄的週以 0 表示且不省略。
- 每週 `avgBodyWeight`，無紀錄為 `null`（不補 0、不內插）。
- UTC 週邊界、稀疏月份 x 軸標籤。
- 當週長條為「週一到當日」的部分累積值，以進行中樣式呈現。

## 命名策略

getter 名稱把週數寫死，改動時一併更新以保持與現有命名慣例一致：

- `trailing16WeekVolumeInfo` → `trailing12WeekVolumeInfo`
- Dashboard 變數 `volume16` → `volume12`

## 改動範圍（4 檔）

### 1. `src/stores/sessionStore.js`（getter，約 line 149）

- getter 改名 `trailing16WeekVolumeInfo` → `trailing12WeekVolumeInfo`。
- `const WEEKS = 16` → `12`。
- 更新上方註解（原 146–148）的「16-week」字樣。

### 2. `src/views/DashboardView.vue`

- 變數 `volume16` → `volume12`（宣告與所有引用）。
- UI 文案「過去 16 週平均：」→「過去 12 週平均：」。
- 更新相關註解的「16 週」字樣。

### 3. `src/stores/sessionStore.test.js`

- `describe` 名稱與 getter 呼叫改名。
- 長度斷言 `toHaveLength(16)` → `12`。
- **mock 資料保留 16 週不動**（`buildDataset` 仍產 16 週），
  藉此額外驗證 getter 正確截斷到最近 12 週。
- 相應重映射索引斷言（新視窗保留原 index 4..15、丟棄最舊 4 週）：
  - `weeks[15].isCurrent` → `weeks[11].isCurrent`（當週、avgBW 78.0）
  - null 體重週 `weeks[7]` → `weeks[3]`
  - `weeks[0].avgBodyWeight` 由 76.2 → 76.3（新視窗最舊週＝原 index 4）
  - 「該週多筆體重取平均」測試（monday `2026-06-29`）落在 12 週視窗內，
    以 `.find(w => w.monday === ...)` 定位，**不需改動**。

### 4. `openspec/specs/weekly-training-volume/spec.md`

- 三條相關 Requirement 標題與內文的「16 週／16 筆／÷16」全部改為
  「12 週／12 筆／÷12」，含情境範例中的數字（例如「僅有 3 個週有紀錄
  → 仍為 16 筆，其中 13 筆為 0」需重算為「12 筆，其中 9 筆為 0」）。

## 測試策略

沿用現有 vitest。改完後執行專案既有測試指令（`npm run test`）確認全綠。
無需新增測試檔。

## 非目標（YAGNI）

- 不做週數可設定化（設定頁、參數化）。
- 不調整 UTC 週邊界或 UTC+8 時區議題（既有 deferred 項目）。
- 不改動其他圖表或 sparkline。
