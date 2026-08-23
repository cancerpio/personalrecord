# 趨勢基準統一為 12 週 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **補寫聲明**：本計畫於實作完成後補寫，checkbox 已標記為完成。
> 內容如實對應 branch `feat/bw-trend-12week-and-last-exercise` 上實際執行的順序與程式碼。

**Goal:** 修正 Dashboard 體重趨勢 chip 把 `+0.27 kg` 顯示成 `-0.3 kg` 的錯誤，並把卡片上三個互相矛盾的平均值收斂成單一的「12 週基準」。

**Architecture:** 在 `sessionStore.js` 新增模組層級的 `getBaselineWeekKeys()`，讓容積 chip、體重 chip、圖上基準線三處共用同一組週視窗。判定與顯示共用 `round1()` 的四捨五入結果，顯示側再經 `signed()` 加上正負號。DashboardView 只做消費與文案。

**Tech Stack:** Vue 3、Pinia、Vitest、Highcharts。

**Spec:** [docs/superpowers/specs/2026-08-23-twelve-week-baseline-design.md](../specs/2026-08-23-twelve-week-baseline-design.md)

## Global Constraints

- 所有註解／文案／文件一律用繁體中文。
- 視窗定義固定為「自當週往回推 12 個完整週，不含當週」，三處共用同一個 helper，不得各自實作。
- 空白週處理刻意不一致：容積補 0、分母固定 12；體重跳過、分母為實際有紀錄的週數。
- 體重門檻 `BW_THRESHOLD = 0.5`（kg），端點視為持平（`|r| ≤ 0.5` → stable）。
- 判定與顯示 SHALL 吃同一個四捨五入後的值，且不得產生 `-0.0`。
- 容積 chip 的持平圖示維持水平線（旁邊有文字標籤，不會誤讀）；只改體重 chip。
- git commit 由使用者自行操作（不自動下 git 指令）；plan 中的 commit 步驟為手動提醒。
- 測試指令：`npm test`（= `vitest run`）。

---

### Task 1: 12 週基準視窗與容積趨勢

**Files:**
- Modify: `src/stores/sessionStore.js:36-51`（新增 helper）、`src/stores/sessionStore.js:134-175`（容積趨勢）
- Test: `src/stores/sessionStore.test.js`（重寫容積趨勢 describe）

**Interfaces:**
- Produces: `getBaselineWeekKeys(currentMonday, weeks = 12)` → `string[]`，12 個 `YYYY-MM-DD` 週一 key，由舊到新，不含當週。
- Produces: `useSessionStore().weeklyTrainingVolumeInfo.averageVolume` → `number`，視窗內容積總和（空白週補 0）÷ 12，四捨五入為整數。

- [x] **Step 1: 改寫容積趨勢測試以期望 12 週基準（先紅）**

編輯 `src/stores/sessionStore.test.js`，把原 describe 標題與案例改為基準語意。假時間為 `2026-07-08T12:00:00Z`（當週 = 2026-07-06），視窗因此是 2026-04-13 ～ 2026-06-29。

```js
  it('基準為最近 12 個完整週，空白週補 0、分母固定 12', () => {
    const store = useSessionStore();
    store.sessions = [
      sess('2026-06-29', 12000), // 視窗內唯一有紀錄的完整週
      sess('2026-07-06', 1000),  // 當週
    ];
    expect(store.weeklyTrainingVolumeInfo.averageVolume).toBe(1000); // 12000 / 12
  });

  it('當週容積不計入基準', () => {
    const store = useSessionStore();
    store.sessions = [
      sess('2026-06-29', 12000),
      sess('2026-07-06', 999999), // 當週再大也不該影響基準
    ];
    expect(store.weeklyTrainingVolumeInfo.averageVolume).toBe(1000);
  });

  it('超出 12 週視窗的紀錄不計入基準', () => {
    const store = useSessionStore();
    store.sessions = [
      sess('2026-04-06', 999999), // 當週往回第 13 週，已在視窗外
      sess('2026-06-29', 12000),
      sess('2026-07-06', 1000),
    ];
    expect(store.weeklyTrainingVolumeInfo.averageVolume).toBe(1000);
  });

  it('視窗內完全沒有訓練紀錄 → 首週訓練中', () => {
    const store = useSessionStore();
    store.sessions = [sess('2026-07-06', 1000)];
    expect(store.weeklyTrainingVolumeInfo.statusLabel).toBe('首週訓練中');
  });
```

- [x] **Step 2: 執行測試確認失敗**

Run: `npm test`
Expected: FAIL，`averageVolume` 收到 12000（舊的「所有有紀錄完整週平均」）而非 1000。

- [x] **Step 3: 新增視窗 helper**

在 `src/stores/sessionStore.js` 的 `getWeeklyBodyWeightAverages` 之後、`toTimestamp` 之前加入：

```js
const BASELINE_WEEKS = 12;
function getBaselineWeekKeys(currentMonday, weeks = BASELINE_WEEKS) {
    const [y, m, d] = currentMonday.split('-').map(Number);
    const base = new Date(Date.UTC(y, m - 1, d));
    const keys = [];
    for (let i = weeks; i >= 1; i--) {
        const dt = new Date(base);
        dt.setUTCDate(dt.getUTCDate() - i * 7);
        const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(dt.getUTCDate()).padStart(2, '0');
        keys.push(`${dt.getUTCFullYear()}-${mm}-${dd}`);
    }
    return keys;
}
```

- [x] **Step 4: 容積趨勢改用視窗**

把 `weeklyTrainingVolumeInfo` 裡的 `completeWeeks` 區塊換掉：

```js
            const baselineWeeks = getBaselineWeekKeys(currentMonday);
            const hasBaselineVolume = baselineWeeks.some(monday => weeklyVolumes[monday] !== undefined);

            if (!hasBaselineVolume) {
                // 視窗內完全沒有訓練紀錄，維持既有無資料處理
                trend = currentVolume > 0 ? 'up' : 'none';
                statusLabel = currentVolume > 0 ? '首週訓練中' : '—';
            } else {
                averageVolume = Math.round(
                    baselineWeeks.reduce((sum, monday) => sum + (weeklyVolumes[monday] || 0), 0) / BASELINE_WEEKS
                );
```

`trendPct` 與 ±5% 的判定維持不變。

- [x] **Step 5: 圖上基準線改用同一組視窗**

`trailing12WeekVolumeInfo` 的 `average` 由「序列總和 / 12（含當週）」改為：

```js
            const average = Math.round(
                getBaselineWeekKeys(currentMonday).reduce((sum, monday) => sum + (weeklyVolumes[monday] || 0), 0) / BASELINE_WEEKS
            );
```

並補上驗證兩者同值的測試：

```js
  it('average 為 12 週基準（不含當週），與標頭 chip 的基準同值', () => {
    const store = useSessionStore();
    store.sessions = [
      { id: 'a', date: '2026-06-29', exercise: 'Squat', reps: 1, weight: 12000 },
      { id: 'b', date: '2026-07-06', exercise: 'Squat', reps: 1, weight: 999999 }, // 當週不計入
    ];
    expect(store.trailing12WeekVolumeInfo.average).toBe(1000);
    expect(store.trailing12WeekVolumeInfo.average).toBe(store.weeklyTrainingVolumeInfo.averageVolume);
  });
```

- [x] **Step 6: 執行測試確認通過**

Run: `npm test`
Expected: PASS。

- [x] **Step 7: Commit（手動）**

```bash
git add src/stores/sessionStore.js src/stores/sessionStore.test.js
git commit -m "fix: 容積趨勢基準改為最近 12 個完整週"
```

---

### Task 2: 體重基準、門檻與四捨五入判定

**Files:**
- Modify: `src/stores/sessionStore.js:36-58`（新增 `round1`）、`src/stores/sessionStore.js:190-210`（體重趨勢）
- Test: `src/stores/sessionStore.test.js`（重寫體重 describe）

**Interfaces:**
- Consumes: Task 1 的 `getBaselineWeekKeys()` 與 `baselineWeeks`。
- Produces: `round1(value)` → `number`，四捨五入到小數一位，`-0` 正規化為 `0`。
- Produces: `weeklyTrainingVolumeInfo.bodyWeightDelta` → `number | null`，**已四捨五入到小數一位**。

- [x] **Step 1: 寫失敗測試（門檻端點、四捨五入、-0、視窗邊界）**

```js
  it('基準只平均「視窗內有體重紀錄的週」，空白週跳過而非補 0', () => {
    const store = useSessionStore();
    store.bodyMetrics = [
      bw('2026-06-29', 76.0), // 視窗 12 週內唯一有紀錄的完整週
      bw('2026-07-06', 77.0), // 當週
    ];
    const info = store.weeklyTrainingVolumeInfo;
    expect(info.bodyWeightDelta).toBeCloseTo(1.0, 5); // 基準 76.0，而非 76.0/12
    expect(info.bodyWeightTrend).toBe('up');
  });

  it('差距四捨五入後恰為 0.5 → 持平（門檻含端點）', () => {
    const store = useSessionStore();
    store.bodyMetrics = [bw('2026-06-29', 76.0), bw('2026-07-06', 76.54)];
    const info = store.weeklyTrainingVolumeInfo;
    expect(info.bodyWeightDelta).toBe(0.5);
    expect(info.bodyWeightTrend).toBe('stable');
  });

  it('差距四捨五入後為 0.6 → 上升', () => {
    const store = useSessionStore();
    store.bodyMetrics = [bw('2026-06-29', 76.0), bw('2026-07-06', 76.6)];
    expect(store.weeklyTrainingVolumeInfo.bodyWeightTrend).toBe('up');
  });

  it('bodyWeightDelta 已四捨五入到小數一位，且不得為 -0', () => {
    const store = useSessionStore();
    store.bodyMetrics = [bw('2026-06-29', 76.0), bw('2026-07-06', 75.96)]; // 差 -0.04
    const info = store.weeklyTrainingVolumeInfo;
    expect(Object.is(info.bodyWeightDelta, -0)).toBe(false);
    expect(info.bodyWeightDelta).toBe(0);
    expect(info.bodyWeightTrend).toBe('stable');
  });
```

- [x] **Step 2: 執行測試確認失敗**

Run: `npm test`
Expected: FAIL。`0.5` 那題舊行為判定為 `up`（0.54 > 0.3）；`-0` 那題舊行為回傳未四捨五入的 `-0.04`。

- [x] **Step 3: 新增 `round1` helper**

```js
function round1(value) {
    const r = Number(value.toFixed(1));
    return r === 0 ? 0 : r;
}
```

- [x] **Step 4: 體重趨勢改用視窗與新門檻**

```js
            const BW_THRESHOLD = 0.5;
            const weeklyBW = getWeeklyBodyWeightAverages(state.bodyMetrics);
            const currentBodyWeight = weeklyBW[currentMonday] !== undefined ? weeklyBW[currentMonday] : null;

            const baselineBWWeeks = baselineWeeks.filter(monday => weeklyBW[monday] !== undefined);

            let bodyWeightTrend = 'none';
            let bodyWeightDelta = null;
            if (currentBodyWeight !== null && baselineBWWeeks.length > 0) {
                const avgBW = baselineBWWeeks.reduce((sum, monday) => sum + weeklyBW[monday], 0) / baselineBWWeeks.length;
                bodyWeightDelta = round1(currentBodyWeight - avgBW);
                if (bodyWeightDelta > BW_THRESHOLD) bodyWeightTrend = 'up';
                else if (bodyWeightDelta < -BW_THRESHOLD) bodyWeightTrend = 'down';
                else bodyWeightTrend = 'stable';
            }
```

- [x] **Step 5: 執行測試確認通過**

Run: `npm test`
Expected: PASS。

- [x] **Step 6: Commit（手動）**

```bash
git add src/stores/sessionStore.js src/stores/sessionStore.test.js
git commit -m "fix: 體重趨勢改用 12 週基準，門檻放寬至 ±0.5kg"
```

---

### Task 3: `signed()` 格式化工具

**Files:**
- Create: `src/utils/format.js`
- Test: `src/utils/format.test.js`

**Interfaces:**
- Produces: `signed(value, digits = 1)` → `string`，例：`signed(0.1) === '+0.1'`、`signed(-0.04) === '0.0'`。

- [x] **Step 1: 寫失敗測試**

```js
import { describe, it, expect } from 'vitest';
import { signed } from './format.js';

describe('signed — 帶正負號的數值格式化', () => {
  it('正值加上 + 號', () => {
    expect(signed(0.1)).toBe('+0.1');
    expect(signed(1.25)).toBe('+1.3');
  });

  it('負值加上 - 號', () => {
    expect(signed(-0.6)).toBe('-0.6');
  });

  it('零不加號', () => {
    expect(signed(0)).toBe('0.0');
  });

  it('四捨五入後為零時不得產生 -0.0', () => {
    expect(signed(-0.04)).toBe('0.0');
    expect(signed(0.04)).toBe('0.0');
  });

  it('先四捨五入再決定符號，符號與顯示值永遠一致', () => {
    expect(signed(-0.049)).toBe('0.0');
    expect(signed(-0.05)).toBe('-0.1');
  });
});
```

- [x] **Step 2: 執行測試確認失敗**

Run: `npm test`
Expected: FAIL，`Cannot find module './format.js'`。

- [x] **Step 3: 實作**

```js
export function signed(value, digits = 1) {
    const rounded = Number(value.toFixed(digits));
    const sign = rounded > 0 ? '+' : rounded < 0 ? '-' : '';
    return `${sign}${Math.abs(rounded).toFixed(digits)}`;
}
```

- [x] **Step 4: 執行測試確認通過**

Run: `npm test`
Expected: PASS。

- [x] **Step 5: Commit（手動）**

```bash
git add src/utils/format.js src/utils/format.test.js
git commit -m "feat: 新增 signed() 帶號格式化工具"
```

---

### Task 4: Dashboard chip 圖示與文案

**Files:**
- Modify: `src/views/DashboardView.vue:7`（import）、`:29-35`（`bwTrendLabel`）、`:137`（基準線標籤）、`:376`（體重 chip 圖示）、`:381`（basis-note）、`:391`（footer）

**Interfaces:**
- Consumes: Task 3 的 `signed()`；Task 2 的 `bodyWeightDelta`（已四捨五入）。

- [x] **Step 1: `bwTrendLabel` 改用 `signed()`**

```js
const bwTrendLabel = computed(() => {
  const info = volumeInfo.value;
  if (info.bodyWeightTrend === 'none' || info.bodyWeightDelta == null) return '—';
  // 帶正負號。舊版用 Math.abs() 把方向吃掉，只靠 icon 表達，
  // 而「持平」的水平線 icon 與負號難以區分，導致 +0.27 被讀成 -0.3。
  return `${signed(info.bodyWeightDelta)} kg`;
});
```

並在檔案頂部加入 `import { signed } from '../utils/format.js';`。

- [x] **Step 2: 體重 chip 的持平圖示改為實心圓點**

只改體重 chip 的 `v-else`（`volumeInfo.bodyWeightTrend` 那一組），容積 chip 的水平線不動：

```html
<svg v-else viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="3.2"></circle></svg>
```

`fill` / `stroke` 必須這樣寫，沿用 chip 既有的 `fill="none" stroke="currentColor"` 會畫成空心圈。

- [x] **Step 3: 文案三處對齊新定義**

```html
<div class="basis-note">趨勢基準：本週 vs 過去 12 個完整週平均（不含本週）；體重未達 ±0.5 kg 視為持平</div>
```

```html
<span class="history-average">過去 12 個完整週平均：{{ volume12.average.toLocaleString() }} kg／週（不含本週）</span>
```

```js
            text: `12 週基準 ${avg.toLocaleString()}`,
```

- [x] **Step 4: 驗證 build 通過**

Run: `npm run build`
Expected: `✓ built`。（既有的 chunk > 500 kB 警告與本次改動無關。）

- [x] **Step 5: Commit（手動）**

```bash
git add src/views/DashboardView.vue
git commit -m "fix: 體重 chip 改用圓點與帶號數字，文案改為相對語意"
```

---

### Task 5: 正式資料回歸測試

**Files:**
- Modify: `src/stores/sessionStore.test.js`（檔尾新增 describe）

**Interfaces:**
- Consumes: Task 1、Task 2 的完整行為。

- [x] **Step 1: 以 2026-08-23 的正式資料快照建立回歸測試**

假時間設為 `2026-08-23T12:00:00Z`（當週 = 2026-08-17）。斷言修正後的結果：

```js
    const info = store.weeklyTrainingVolumeInfo;
    const prevWeek = store.trailing12WeekVolumeInfo.weeks.find(w => w.monday === '2026-08-10');

    expect(prevWeek.avgBodyWeight).toBeCloseTo(81.08, 2); // 8/10–8/16
    expect(info.currentBodyWeight).toBeCloseTo(81.15, 2); // 8/17–8/23
    expect(info.currentBodyWeight).toBeGreaterThan(prevWeek.avgBodyWeight);

    // 12 週基準 81.043（視窗 5/25–8/10 內有紀錄的 10 週）→ 差 +0.107 → 顯示 +0.1
    expect(info.bodyWeightDelta).toBe(0.1);
    expect(info.bodyWeightTrend).toBe('stable');
```

體重快照（`REAL_BODY_WEIGHTS`）為 2026-05-26 ～ 2026-08-23 的 43 筆 `[date, bodyWeight]`，
完整內容見 `src/stores/sessionStore.test.js` 檔尾。

- [x] **Step 2: 執行測試確認通過**

Run: `npm test`
Expected: PASS，38 tests。舊實作在這組資料上 `bodyWeightDelta` 為 `0.271`，此測試會擋住回歸。

- [x] **Step 3: Commit（手動）**

```bash
git add src/stores/sessionStore.test.js
git commit -m "test: 加入 2026-08-23 正式資料的體重趨勢回歸測試"
```

---

## 尚未完成

- `openspec/specs/weekly-training-volume/spec.md` 為 `MODIFIED`：
  `Calculate Historical Average and Trend` 的基準定義、
  `Calculate Current Week Average Body Weight and Trend` 的門檻與基準、
  `Provide Trailing 12-Week Volume Series` 的 `average` 定義、
  以及 `Display Volume and Trend on Homepage` 的 basis-note 文案，皆需同步更新。
  已徵詢使用者，待確認後再改。
