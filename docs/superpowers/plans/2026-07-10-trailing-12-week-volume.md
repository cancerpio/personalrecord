# Trailing 12-Week Volume Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將首頁 Dashboard 容積圖的 trailing 視窗從 16 週改為 12 週。

**Architecture:** Pinia getter `trailing16WeekVolumeInfo` 計算固定長度序列，Dashboard 消費它繪製 Highcharts combo 圖。改動是把週數常數 16→12 並一併改名，同步更新測試、UI 文案與 OpenSpec 規格。

**Tech Stack:** Vue 3、Pinia、Vitest、Highcharts。

## Global Constraints

- 所有註解／文案／文件一律用繁體中文。
- 除「週數 16→12」相關者外，不改動任何既有行為（補 0 週、`avgBodyWeight` 為 `null` 不內插、UTC 週邊界、稀疏月份標籤、當週進行中樣式）。
- getter 與 Dashboard 變數命名把週數寫死，改動時一併改名：`trailing16WeekVolumeInfo`→`trailing12WeekVolumeInfo`、`volume16`→`volume12`。
- git commit 由使用者自行操作（不自動下 git 指令）；plan 中的 commit 步驟為手動提醒。
- 測試指令：`npm run test`（= `vitest run`）。

---

### Task 1: Store getter 改為 12 週（test-first）

**Files:**
- Modify: `src/stores/sessionStore.js:146-199`
- Test: `src/stores/sessionStore.test.js:100-131`

**Interfaces:**
- Produces: `useSessionStore().trailing12WeekVolumeInfo` → `{ weeks: Array<{monday, volume, avgBodyWeight, monthLabel, rangeLabel, isCurrent}>, average: number }`，`weeks` 固定 12 筆、由舊到新、含當週。
- Consumes: 既有 `buildDataset()`（產 16 週 mock）不變；getter 內部截斷取最近 12 週。

- [ ] **Step 1: 改測試以期望 12 週（先紅）**

編輯 `src/stores/sessionStore.test.js`。

改 line 100 的 `describe` 標題與 getter 名稱：
```js
describe('trailing12WeekVolumeInfo — 每週平均體重', () => {
```

改 line 108 的 `it` 標題與其斷言區塊（原 108–120），mock 資料保留 16 週不動，只重映射索引（新視窗＝原 index 4..15，丟棄最舊 4 週）：
```js
  it('固定 12 筆、缺值週為 null、當週 avgBodyWeight 正確', () => {
    const store = useSessionStore();
    const { sessions, body } = buildDataset();
    store.sessions = sessions;
    store.bodyMetrics = body;

    const t = store.trailing12WeekVolumeInfo;
    expect(t.weeks).toHaveLength(12);
    expect(t.weeks[3].avgBodyWeight).toBeNull();       // 原第 8 週（16週index 7）→ 12週index 3，無體重紀錄
    expect(t.weeks[11].isCurrent).toBe(true);
    expect(t.weeks[11].avgBodyWeight).toBeCloseTo(78.0, 5);
    expect(t.weeks[0].avgBodyWeight).toBeCloseTo(76.3, 5); // 新視窗最舊週＝原 index 4（bws[4]=76.3）
  });
```

改 line 128 的 getter 呼叫（「該週多筆體重取平均」測試其餘不動，monday `2026-06-29` 落在 12 週視窗內）：
```js
    const t = store.trailing12WeekVolumeInfo;
```

- [ ] **Step 2: 跑測試確認失敗（紅）**

Run: `npm run test`
Expected: FAIL — `store.trailing12WeekVolumeInfo` 為 `undefined`（getter 尚未改名），`Cannot read properties of undefined (reading 'weeks')`。

- [ ] **Step 3: 改 store getter（改名 + WEEKS=12 + 註解）**

編輯 `src/stores/sessionStore.js`。

改註解（原 146–148）：
```js
        // Trailing 12-week volume series for the dashboard bar chart.
        // Returns a fixed-length (12) series ordered oldest -> current week,
        // with missing weeks filled as 0, plus the 12-week average.
```

改 getter 名稱（line 149）：
```js
        trailing12WeekVolumeInfo: (state) => {
```

改常數（line 150）：
```js
            const WEEKS = 12;
```

其餘邏輯（迴圈、平均、回傳）不動——皆以 `WEEKS` 計算。

- [ ] **Step 4: 跑測試確認通過（綠）**

Run: `npm run test`
Expected: PASS — 全部測試綠燈。

- [ ] **Step 5: Commit（手動）**

提醒使用者提交：
```
git add src/stores/sessionStore.js src/stores/sessionStore.test.js
git commit -m "feat: trailing volume 由 16 週改為 12 週（store + 測試）"
```

---

### Task 2: DashboardView 變數改名與 UI 文案

**Files:**
- Modify: `src/views/DashboardView.vue`（lines 12, 13, 14, 59, 61, 68, 381, 388, 671）

**Interfaces:**
- Consumes: `sessionStore.trailing12WeekVolumeInfo`（Task 1 產出）。

**注意：** 只改與週數相關的行。CSS 中的 `16px`（lines 436, 550, 614, 634, 639）為版面尺寸，**不得更動**。

- [ ] **Step 1: 改變數宣告與註解**

編輯 `src/views/DashboardView.vue`。

line 12–13：
```js
// Trailing 12-week volume series for the bar chart
const volume12 = computed(() => sessionStore.trailing12WeekVolumeInfo);
```

line 14：
```js
const hasAnyBodyWeight = computed(() => volume12.value.weeks.some(w => w.avgBodyWeight != null));
```

line 59：
```js
// ---- 12 週容積 + 每週平均體重 combo 圖 ----
```

line 61：
```js
  const weeks = volume12.value.weeks;
```

line 68：
```js
  const avg = volume12.value.average;
```

- [ ] **Step 2: 改 template 文案與註解**

line 381：
```html
      <!-- 過去 12 週容積長條 + 每週平均體重折線（Highcharts combo） -->
```

line 388：
```html
        <span class="history-average">過去 12 週平均：{{ volume12.average.toLocaleString() }} kg／週</span>
```

line 671（CSS 區塊註解）：
```css
/* ===== 12 週容積 + 體重 combo 圖 ===== */
```

- [ ] **Step 3: 確認無殘留舊名稱**

Run: `grep -n "volume16\|trailing16\|16 週" src/views/DashboardView.vue`
Expected: 無輸出（空）。

- [ ] **Step 4: 跑測試 + build 驗證**

Run: `npm run test && npm run build`
Expected: 測試全綠；`vite build` 成功無錯誤（確認 template 引用的 `volume12` 正確）。

- [ ] **Step 5: Commit（手動）**

```
git add src/views/DashboardView.vue
git commit -m "feat: Dashboard 容積圖文案與變數改為 12 週"
```

---

### Task 3: 同步 OpenSpec 規格為 12 週

**Files:**
- Modify: `openspec/specs/weekly-training-volume/spec.md`（lines 84–145 內的 16 相關字樣）

**Interfaces:** 無程式介面；純文件同步，使規格與實作一致。

- [ ] **Step 1: 逐處改寫 spec 的週數字樣**

編輯 `openspec/specs/weekly-training-volume/spec.md`。逐行對應改寫：

line 84：
```
### Requirement: Provide Trailing 12-Week Volume Series
```

line 85：
```
系統 SHALL 提供最近 12 個日曆週（含當週，往回共 12 週）的訓練容積序列，供首頁圖表使用。每一週的容積為該週內所有訓練紀錄的 `reps * weight` 加總；**沒有任何紀錄的週 SHALL 以 0 表示且不得省略**，使序列固定為 12 筆、依時間由舊到新排序。系統 SHALL 一併提供此 12 週的平均容積。
```

line 87：
```
#### Scenario: 序列固定 12 筆並補零
```

line 88：
```
- **WHEN** 過去 12 週中僅有 3 個週有訓練紀錄
```

line 89（13→9：12 − 3 = 9）：
```
- **THEN** 回傳的序列仍 SHALL 為 12 筆，其中 9 筆容積為 0，且順序由最舊週到當週
```

line 91：
```
#### Scenario: 平均值涵蓋全部 12 週
```

line 92：
```
- **WHEN** 12 週容積序列為已知值
```

line 93：
```
- **THEN** 系統 SHALL 回傳「12 週平均 = 序列總和 / 12」（含補 0 的週一併計入）
```

line 95：
```
### Requirement: Display 12-Week Volume Bar Chart
```

line 96（把「過去 16 週」「16 週平均」兩處改為 12）：
```
首頁的容積卡片 SHALL 在標頭之下，以長條圖顯示過去 12 週的容積序列：每一週一根長條、其餘週以次要樣式呈現。**當週該根為「週一到當日」的部分累積值，SHALL 以「進行中」樣式（如 ghost／虛線外框）並輔以進行中標示呈現，明確表達其為未完成的部分加總，避免被誤讀為容積驟降。** 卡片 SHALL 顯示一條代表 12 週平均的參考線，並顯示 12 週平均的數值。使用者對某一週長條進行 hover 或點擊時，系統 SHALL 顯示該週明細。
```

line 110：
```
### Requirement: Provide Trailing 12-Week Average Body Weight
```

line 111（「最近 16 週」與「既有 16 週容積序列欄位」兩處改 12）：
```
系統 SHALL 在最近 12 週的序列中，為每一週提供該週的平均體重 `avgBodyWeight`。每一週的平均體重 SHALL 為該週（週一到週日，沿用既有 UTC 週邊界）內所有體重紀錄 `bodyWeight` 的算術平均；**該週若無任何體重紀錄，`avgBodyWeight` SHALL 為 `null`**（不得補 0，不得內插）。此欄位 SHALL 以新增方式提供，不影響既有 12 週容積序列欄位。
```

line 122（「16 週容積圖」→12）：
```
首頁 12 週容積圖 SHALL 在既有的容積長條之上，疊加一條「每週平均體重」折線，形成雙軸圖：容積長條使用左軸（由 0 起算），體重折線使用右軸（依資料自動決定範圍，不從 0 起算）。`avgBodyWeight` 為 `null` 的週，折線 SHALL 於該處斷開、不繪製資料點與連線（不補 0、不內插）。圖表 SHALL 提供圖例以區分容積與體重兩個數列。使用者 hover 某一週時，明細 SHALL 一併顯示該週的容積與平均體重（該週無體重紀錄時 SHALL 顯示為無紀錄）。
```

line 126：
```
- **THEN** 12 週圖 SHALL 同時顯示容積長條（左軸）與每週平均體重折線（右軸），並提供可區分兩數列的圖例
```

line 129：
```
- **WHEN** 12 週中某一週 `avgBodyWeight` 為 `null`
```

line 141：
```
- **WHEN** 12 週非 `null` 的體重資料實際跨度小於 8kg
```

line 145：
```
- **WHEN** 過去 12 週皆無任何體重紀錄
```

- [ ] **Step 2: 確認無殘留 16 字樣**

Run: `grep -n "16" openspec/specs/weekly-training-volume/spec.md`
Expected: 無輸出（空）——該檔內所有 16 皆為週數相關，全部改完後應無殘留。

- [ ] **Step 3: Commit（手動）**

```
git add openspec/specs/weekly-training-volume/spec.md
git commit -m "docs: OpenSpec 規格同步為 12 週容積序列"
```

---

## Self-Review

**Spec coverage：**
- 行為變更（WEEKS 16→12、平均÷12）→ Task 1。 ✅
- 命名策略（getter/變數改名）→ Task 1 + Task 2。 ✅
- 改動範圍 4 檔：sessionStore.js → Task 1；sessionStore.test.js → Task 1；DashboardView.vue → Task 2；spec.md → Task 3。 ✅
- 測試策略（沿用 vitest、mock 保留 16 週驗證截斷、全綠）→ Task 1 Step 1/4。 ✅
- 非目標（不做週數可設定化、不動時區、不動其他圖表）→ 計畫未觸及，一致。 ✅

**Placeholder scan：** 無 TBD/TODO；每個 code step 均有完整內容。 ✅

**Type consistency：** getter 名稱 `trailing12WeekVolumeInfo` 於 Task 1（store + 測試）與 Task 2（Dashboard 消費）一致；變數 `volume12` 於 Task 2 內宣告與引用一致。 ✅
