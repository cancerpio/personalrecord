# 動作連續週數總覽 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Dashboard 的 12 週容積長條圖下方，用一張表顯示每個動作「連續幾週沒換過」，只顯示、不通知。

**Architecture:** 新增 store getter `exerciseStreaks` 做全部計算（週分組、連續判定、視窗過濾、排序），新增純表現元件 `ExerciseStreakList.vue` 負責渲染與顏色分段，`DashboardView.vue` 只負責掛載。週邊界沿用既有的 `getMondayOfDate()`，與訓練容積同一套基準。

**Tech Stack:** Vue 3（`<script setup>`）、Pinia、Vitest。

**Spec:** [docs/superpowers/specs/2026-08-25-exercise-streak-overview-design.md](../specs/2026-08-25-exercise-streak-overview-design.md)

## Global Constraints

- 所有註解／文案／文件一律用**繁體中文**。
- 週邊界一律沿用既有的模組層級 `getMondayOfDate()`（UTC、週一起算）。**不得另寫一套週邊界邏輯**。
- **連續判定的精確語意**：從錨點往回逐週檢查，「該週有練」計入並把連續未命中歸零；「該週沒練」則未命中 +1，**連續**未命中達 2 次即停止。允許的是「每次最多連空一週」，不是「整段只能空一週」。例：`有/空/有/空/有` → 3。
- **錨點是該動作實際最後練到的那一週**，不是當週。
- **視窗只決定「這個動作要不要顯示」**，為當週往回共 12 週（**含當週**，即當週週一減 11 週）。**連續週數本身不受視窗限制**，可往回數超過 12 週。
- `lastDate` 回傳**實際訓練日**（`YYYY-MM-DD`），不是該週週一。週一僅供內部計算，不對外顯示。
- getter **不得回傳顏色、CSS class 等表現層資訊**；顏色分段由元件依 `streakWeeks` 判定。
- **不做**動作名稱別名合併（`Overhead Press` 與 `Barbell Overhead Press` 分成兩行是刻意的）。
- **不做**通知、警報 pill、emoji、icon。
- 既有 38 個測試在全程必須持續通過。
- git commit 由使用者自行操作（**不自動下 git 指令**）；plan 中的 commit 步驟為手動提醒。
- 測試指令：`npm test`（= `vitest run`）。

---

### Task 1: `exerciseStreaks` getter

**Files:**
- Modify: `src/stores/sessionStore.js`（模組層級新增 `shiftWeeks`、`computeStreakWeeks`；getters 區新增 `exerciseStreaks`）
- Test: `src/stores/sessionStore.test.js`（檔尾新增 describe）

**Interfaces:**
- Consumes: 既有模組層級 `getMondayOfDate(dateStr) -> 'YYYY-MM-DD'`（週一，UTC）
- Produces: getter `exerciseStreaks` → `Array<{ exercise: string, streakWeeks: number, lastDate: string }>`，依 `streakWeeks` 由大到小排序，同分時依 `exercise` 字典序升冪

---

#### 回合 A：核心連續規則

- [ ] **Step 1: 寫失敗的測試**

在 `src/stores/sessionStore.test.js` 檔尾加入：

```js
describe('exerciseStreaks — 動作連續週數總覽', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    // 當週 = 2026-08-24（週一）那一週
    vi.setSystemTime(new Date('2026-08-25T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // 產生一筆紀錄的小工具，避免每個測試重複打字。
  const s = (date, exercise) => ({ id: `${exercise}-${date}`, date, exercise, weight: 100, reps: 5 });

  it('連續三週皆有紀錄時回傳 3', () => {
    const store = useSessionStore();
    store.sessions = [
      s('2026-08-10', 'Squat'),
      s('2026-08-17', 'Squat'),
      s('2026-08-24', 'Squat'),
    ];
    expect(store.exerciseStreaks).toEqual([
      { exercise: 'Squat', streakWeeks: 3, lastDate: '2026-08-24' },
    ]);
  });

  it('中間連空一週仍算連續，且空週不計入週數', () => {
    const store = useSessionStore();
    store.sessions = [
      s('2026-08-10', 'Squat'),
      // 2026-08-17 那週沒練
      s('2026-08-24', 'Squat'),
    ];
    expect(store.exerciseStreaks[0].streakWeeks).toBe(2);
  });

  it('中間連空兩週即斷開，只算最近那一段', () => {
    const store = useSessionStore();
    store.sessions = [
      s('2026-08-03', 'Squat'),
      // 2026-08-10、2026-08-17 兩週都沒練
      s('2026-08-24', 'Squat'),
    ];
    expect(store.exerciseStreaks[0].streakWeeks).toBe(1);
  });

  it('允許的是「每次最多連空一週」，不是「整段只能空一週」', () => {
    const store = useSessionStore();
    store.sessions = [
      s('2026-07-27', 'Squat'),
      // 2026-08-03 空
      s('2026-08-10', 'Squat'),
      // 2026-08-17 空
      s('2026-08-24', 'Squat'),
    ];
    expect(store.exerciseStreaks[0].streakWeeks).toBe(3);
  });
});
```

- [ ] **Step 2: 執行測試，確認它失敗**

Run: `npx vitest run -t 'exerciseStreaks'`
Expected: FAIL，`store.exerciseStreaks` 為 `undefined`

- [ ] **Step 3: 寫最小實作**

在 `src/stores/sessionStore.js` 的 `getMondayOfDate` 之後、`getWeeklyBodyWeightAverages` 之前加入兩個模組層級函式：

```js
// 以週為單位平移一個「YYYY-MM-DD」週一字串。沿用 UTC，與 getMondayOfDate 同基準。
function shiftWeeks(mondayStr, deltaWeeks) {
    const [y, m, d] = mondayStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + deltaWeeks * 7);
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    return `${dt.getUTCFullYear()}-${mm}-${dd}`;
}

// 連續週數：自錨點那一週往回逐週檢查。
// 「該週有練」計入並把連續未命中歸零；「該週沒練」則未命中 +1，
// 連續未命中超過 MAX_GAP_WEEKS 即停止。
// 亦即允許「每次最多連空一週」，而非「整段期間只能空一週」——
// 使用者不會每週都練同一個動作，中間本來就有空窗週，
// 嚴格連續會讓幾乎所有動作都停在 1~3，指標失去意義。
const MAX_GAP_WEEKS = 1;
function computeStreakWeeks(weekSet, anchorMonday) {
    if (!weekSet.has(anchorMonday)) return 0;
    let count = 0;
    let misses = 0;
    let cursor = anchorMonday;
    while (true) {
        if (weekSet.has(cursor)) {
            count += 1;
            misses = 0;
        } else {
            misses += 1;
            if (misses > MAX_GAP_WEEKS) break;
        }
        cursor = shiftWeeks(cursor, -1);
    }
    return count;
}
```

在 getters 區、`getLastLoggedExercise` 之後加入：

```js
        // 每個動作「連續幾週沒換過」，供 Dashboard 的動作連續週數總覽顯示。
        // 產品意圖是結構性負荷輪替（同一受力結構連續使用多久），不是偵測停滯，
        // 因此不看重量變化——重量在漲反而讓關節承受的絕對負荷更大。
        //
        // 視窗（最近 12 週、含當週）只決定「這個動作要不要顯示」；
        // 連續週數本身不受視窗限制，可往回數超過 12 週。
        // 視窗回答「這個動作還在練嗎」，連續週數回答「它已經連續多久沒換」。
        //
        // 刻意不做動作名稱別名合併：Overhead Press 與 Barbell Overhead Press
        // 會分成兩行，讓名稱分岔問題直接顯示在畫面上，而不是靜靜地壞在背後。
        exerciseStreaks: (state) => {
            const WINDOW_WEEKS = 12;

            // 依動作彙整「有練到的週」與「實際最後訓練日」
            const byExercise = {};
            state.sessions.forEach(session => {
                if (!session || !session.date || !session.exercise) return;
                let entry = byExercise[session.exercise];
                if (!entry) {
                    entry = byExercise[session.exercise] = { weeks: new Set(), lastDate: session.date };
                }
                entry.weeks.add(getMondayOfDate(session.date));
                if (session.date > entry.lastDate) entry.lastDate = session.date;
            });

            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const windowStart = shiftWeeks(getMondayOfDate(todayStr), -(WINDOW_WEEKS - 1));

            return Object.keys(byExercise)
                .map(exercise => {
                    const { weeks, lastDate } = byExercise[exercise];
                    return {
                        exercise,
                        streakWeeks: computeStreakWeeks(weeks, getMondayOfDate(lastDate)),
                        lastDate,
                    };
                })
                // 最後練到的那一週落在視窗內才顯示（等價於「視窗內任一週有紀錄」）
                .filter(row => getMondayOfDate(row.lastDate) >= windowStart)
                // 連續週數由大到小；同分時依動作名字典序，確保順序穩定可測
                .sort((a, b) => b.streakWeeks - a.streakWeeks || a.exercise.localeCompare(b.exercise));
        },
```

- [ ] **Step 4: 執行測試，確認通過**

Run: `npx vitest run -t 'exerciseStreaks'`
Expected: PASS（4 個測試）

- [ ] **Step 5: 執行完整測試，確認沒有回歸**

Run: `npm test`
Expected: PASS，42 個測試（既有 38 + 新增 4）

---

#### 回合 B：錨點、視窗、排序

- [ ] **Step 6: 寫失敗的測試**

在同一個 `describe` 內接著加入：

```js
  it('錨點是該動作最後練到的那一週，不是當週', () => {
    const store = useSessionStore();
    store.sessions = [
      s('2026-08-03', 'Deadlift'),
      s('2026-08-10', 'Deadlift'),
      s('2026-08-17', 'Deadlift'),
      // 當週（2026-08-24）沒有練 Deadlift
    ];
    // 若錯用當週當錨點會得到 0；正確答案是從 08-17 那週往回數
    expect(store.exerciseStreaks[0].streakWeeks).toBe(3);
  });

  it('連續週數不受 12 週視窗限制，可往回數超過 12 週', () => {
    const store = useSessionStore();
    // 從 2026-05-04 那週起連續 17 週，最後一筆落在當週
    const sessions = [];
    for (let i = 0; i < 17; i++) {
      const d = new Date(Date.UTC(2026, 4, 4));
      d.setUTCDate(d.getUTCDate() + i * 7);
      sessions.push(s(d.toISOString().slice(0, 10), 'Squat'));
    }
    store.sessions = sessions;
    expect(store.exerciseStreaks[0].streakWeeks).toBe(17);
  });

  it('最後練到的那一週落在 12 週視窗外的動作不顯示', () => {
    const store = useSessionStore();
    store.sessions = [
      s('2026-08-24', 'Squat'),
      // 視窗起點為 2026-08-24 減 11 週 = 2026-06-08，以下這筆更早
      s('2026-05-25', 'Pull Up'),
    ];
    expect(store.exerciseStreaks.map(r => r.exercise)).toEqual(['Squat']);
  });

  it('視窗邊界當週本身算在視窗內', () => {
    const store = useSessionStore();
    store.sessions = [
      s('2026-06-08', 'Pull Up'), // 恰為視窗起點那一週
    ];
    expect(store.exerciseStreaks.map(r => r.exercise)).toEqual(['Pull Up']);
  });

  it('依連續週數由大到小排序，同分時依動作名字典序', () => {
    const store = useSessionStore();
    store.sessions = [
      s('2026-08-24', 'Zercher Squat'),                        // 1 週
      s('2026-08-17', 'Bench Press'), s('2026-08-24', 'Bench Press'), // 2 週
      s('2026-08-24', 'Ab Wheel'),                             // 1 週
    ];
    expect(store.exerciseStreaks.map(r => `${r.exercise}:${r.streakWeeks}`))
      .toEqual(['Bench Press:2', 'Ab Wheel:1', 'Zercher Squat:1']);
  });
```

- [ ] **Step 7: 執行測試**

Run: `npx vitest run -t 'exerciseStreaks'`
Expected: PASS（9 個測試）—— 回合 A 的實作已涵蓋這些行為。若任一條失敗，**不要改測試**，回頭修 `exerciseStreaks`。

---

#### 回合 C：邊界情況

- [ ] **Step 8: 寫失敗的測試**

在同一個 `describe` 內接著加入：

```js
  it('同一週練多次只算一週', () => {
    const store = useSessionStore();
    store.sessions = [
      { id: 'a', date: '2026-08-24', exercise: 'Squat', weight: 100, reps: 5 },
      { id: 'b', date: '2026-08-24', exercise: 'Squat', weight: 105, reps: 3 },
      { id: 'c', date: '2026-08-25', exercise: 'Squat', weight: 110, reps: 1 },
    ];
    expect(store.exerciseStreaks[0].streakWeeks).toBe(1);
  });

  it('lastDate 回傳實際訓練日，不是該週的週一', () => {
    const store = useSessionStore();
    store.sessions = [s('2026-08-25', 'Squat')]; // 該週週一為 2026-08-24
    expect(store.exerciseStreaks[0].lastDate).toBe('2026-08-25');
  });

  it('sessions 為空時回傳空陣列', () => {
    const store = useSessionStore();
    store.sessions = [];
    expect(store.exerciseStreaks).toEqual([]);
  });

  it('缺 date 或缺 exercise 的紀錄被略過且不拋錯', () => {
    const store = useSessionStore();
    store.sessions = [
      { id: 'a', exercise: 'Squat', weight: 100, reps: 5 },   // 無 date
      { id: 'b', date: '2026-08-24', weight: 100, reps: 5 },  // 無 exercise
      null,
      s('2026-08-24', 'Bench Press'),
    ];
    expect(store.exerciseStreaks).toEqual([
      { exercise: 'Bench Press', streakWeeks: 1, lastDate: '2026-08-24' },
    ]);
  });
```

- [ ] **Step 9: 執行測試**

Run: `npx vitest run -t 'exerciseStreaks'`
Expected: PASS（13 個測試）

- [ ] **Step 10: 執行完整測試**

Run: `npm test`
Expected: PASS，51 個測試（既有 38 + 新增 13）

- [ ] **Step 11: 提醒使用者 commit**

建議訊息：`feat(dashboard): 新增 exerciseStreaks getter 計算動作連續週數`
（不要自動執行 git 指令，由使用者自行 commit）

---

### Task 2: `ExerciseStreakList.vue` 元件

**Files:**
- Create: `src/components/ExerciseStreakList.vue`

**Interfaces:**
- Consumes: Task 1 的 `Array<{ exercise, streakWeeks, lastDate }>`，由 prop `rows` 傳入
- Produces: 元件 `<ExerciseStreakList :rows="..." />`

**設計約束（來自 spec 決策 4）：** 不使用 pill、emoji、icon 等警報語彙 —— 本功能刻意不通知，掛警報符號卻沒有後續動作在語意上是矛盾的。只用文字顏色分段。

- [ ] **Step 1: 建立元件檔**

建立 `src/components/ExerciseStreakList.vue`：

```vue
<script setup>
defineProps({
  rows: {
    type: Array,
    default: () => []
  }
});

// 顏色分段。這是視覺分段，不是警報門檻——本功能刻意不通知，
// 因此門檻調整只影響好不好看，改動成本趨近於零。
function levelOf(weeks) {
  if (weeks >= 4) return 'critical';
  if (weeks >= 3) return 'warning';
  return '';
}
</script>

<template>
  <div class="streak-section">
    <div class="streak-header">
      <h2>動作連續週數</h2>
      <p class="streak-desc">同一動作連續幾週沒換過。數字越大代表該受力結構被連續使用越久，可考慮安排變化動作。</p>
    </div>

    <div class="streak-panel glass-panel">
      <div v-if="rows.length === 0" class="streak-empty">
        最近 12 週內尚無訓練紀錄
      </div>

      <template v-else>
        <div class="streak-row streak-row--head">
          <span class="col-exercise">動作</span>
          <span class="col-weeks">連續週數</span>
          <span class="col-date">最後練到</span>
        </div>
        <div v-for="row in rows" :key="row.exercise" class="streak-row">
          <span class="col-exercise">{{ row.exercise }}</span>
          <span class="col-weeks" :class="levelOf(row.streakWeeks)">{{ row.streakWeeks }}</span>
          <span class="col-date">{{ row.lastDate }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.streak-header h2 {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 4px;
  color: var(--text-primary);
}

.streak-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0 0 12px;
  line-height: 1.4;
}

.streak-panel {
  padding: 4px 16px;
}

.streak-row {
  display: grid;
  grid-template-columns: 1fr auto 92px;
  align-items: center;
  gap: 12px;
  height: 30px;
  border-bottom: 1px solid var(--separator-color);
}

.streak-row:last-child {
  border-bottom: none;
}

.streak-row--head {
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.col-exercise {
  font-size: 14px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-weeks {
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: right;
  min-width: 32px;
  color: var(--text-primary);
}

/* 顏色分段：≥4 週紅、3 週琥珀。琥珀色沿用 CycleStatus.vue 既有色值。 */
.col-weeks.critical { color: var(--danger-color); }
.col-weeks.warning { color: #FF9500; }

.col-date {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: var(--text-secondary);
}

.streak-row--head .col-exercise,
.streak-row--head .col-weeks,
.streak-row--head .col-date {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
}

.streak-empty {
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
}
</style>
```

- [ ] **Step 2: 確認測試仍全綠**

Run: `npm test`
Expected: PASS，51 個測試（新增元件不影響既有測試）

說明：本元件為純表現層，邏輯全在 getter 且已被 13 個單元測試覆蓋；
前端元件測試基礎設施尚未建立（`todo_feature_202608.md` #10），故不另寫元件測試。

- [ ] **Step 3: 提醒使用者 commit**

建議訊息：`feat(dashboard): 新增 ExerciseStreakList 元件`

---

### Task 3: 掛載到 DashboardView

**Files:**
- Modify: `src/views/DashboardView.vue`（`<script setup>` 加 import 與 computed；template 第 394 行附近插入元件）

**Interfaces:**
- Consumes: Task 1 的 `sessionStore.exerciseStreaks`、Task 2 的 `ExerciseStreakList` 元件

- [ ] **Step 1: 加入 import**

在 `src/views/DashboardView.vue` 第 5 行 `import SparklineRow ...` 之後加入：

```js
import ExerciseStreakList from '../components/ExerciseStreakList.vue';
```

- [ ] **Step 2: 加入 computed**

在第 14 行 `const volume12 = computed(() => sessionStore.trailing12WeekVolumeInfo);` 之後加入：

```js
const exerciseStreaks = computed(() => sessionStore.exerciseStreaks);
```

- [ ] **Step 3: 在 template 插入元件**

找到 template 中這段（約第 390~396 行）：

```html
      <div class="volume-footer">
        <span class="history-average">過去 12 個完整週平均：{{ volume12.average.toLocaleString() }} kg／週（不含本週）</span>
      </div>
    </div>

    <!-- Sparklines (Performance Trends) -->
```

在 `</div>` 與 `<!-- Sparklines` 之間插入：

```html
    <!-- 動作連續週數：與容積、體重同屬「這週該知道的事」，放在頂部摘要區 -->
    <ExerciseStreakList :rows="exerciseStreaks" />

```

插入後應長成：

```html
      <div class="volume-footer">
        <span class="history-average">過去 12 個完整週平均：{{ volume12.average.toLocaleString() }} kg／週（不含本週）</span>
      </div>
    </div>

    <!-- 動作連續週數：與容積、體重同屬「這週該知道的事」，放在頂部摘要區 -->
    <ExerciseStreakList :rows="exerciseStreaks" />

    <!-- Sparklines (Performance Trends) -->
```

- [ ] **Step 4: 執行測試**

Run: `npm test`
Expected: PASS，51 個測試

- [ ] **Step 5: 在瀏覽器確認畫面**

Run: `npm run dev`

檢查清單：
- 表格出現在 12 週容積長條圖正下方、sparklines 上方
- 動作名左對齊、週數右對齊且數字成一直線、日期為實際訓練日（非週一）
- 連續 ≥4 週的數字為紅色、3 週為琥珀色、其餘為一般文字色
- 沒有任何 pill、emoji 或警示 icon
- 切換系統深色模式後配色正常（顏色皆走 `main.css` 的 token）

**預期看到的內容**（以 2026-08-25 的正式資料為準，共 11 行）：
`Squat 18`、`Overhead Press 7`、`Bench Press 6` 為紅色；
`Barbell Row 3`、`Barbell Overhead Press 3` 為琥珀色；其餘為一般色。

- [ ] **Step 6: 提醒使用者 commit**

建議訊息：`feat(dashboard): 在容積圖下方顯示動作連續週數總覽`

---

### Task 4: OpenSpec 歸檔

**Files:**
- Create: `openspec/specs/exercise-streak-overview/spec.md`

- [ ] **Step 1: 建立 capability spec**

建立 `openspec/specs/exercise-streak-overview/spec.md`：

```markdown
# Capability: Exercise Streak Overview

## Purpose
本能力在 Dashboard 顯示每個動作「連續幾週沒換過」，讓使用者判斷哪些動作已經
連續使用同一受力結構過久、該安排變化動作。本能力只顯示資訊，不發出通知。

## Requirements

### Requirement: Consecutive Week Count
系統 SHALL 為每個動作計算「連續週數」：自該動作**最後有紀錄的那一週**往回逐週檢查，
該週有紀錄則計入並將連續未命中歸零，該週無紀錄則累加連續未命中；
**連續**未命中達 2 次時 SHALL 停止。亦即每次最多容許連空一週，
SHALL NOT 解讀為「整段期間總共只能空一週」。

錨點 SHALL 為該動作最後有紀錄的那一週，SHALL NOT 為當週。
週邊界 SHALL 沿用與訓練容積相同的定義（週一起算）。
同一動作在同一週有多筆紀錄時 SHALL 只計為一週。

#### Scenario: 連續三週皆有紀錄
- **WHEN** 某動作於連續三個週各有紀錄
- **THEN** 連續週數 SHALL 為 3

#### Scenario: 中間連空一週仍算連續
- **WHEN** 某動作於第 1 週與第 3 週有紀錄，第 2 週沒有
- **THEN** 連續週數 SHALL 為 2，空週 SHALL NOT 計入

#### Scenario: 連空兩週即斷開
- **WHEN** 某動作於第 1 週與第 4 週有紀錄，第 2、3 週皆無
- **THEN** 連續週數 SHALL 為 1

#### Scenario: 每次最多連空一週而非整段只能空一週
- **WHEN** 某動作的週序列為「有、空、有、空、有」
- **THEN** 連續週數 SHALL 為 3

#### Scenario: 錨點為最後練到的那一週
- **WHEN** 某動作連續三週有紀錄，但當週沒有練該動作
- **THEN** 連續週數 SHALL 為 3，SHALL NOT 因當週無紀錄而為 0

#### Scenario: 同一週多次只算一週
- **WHEN** 某動作在同一週的三個不同日期各有紀錄
- **THEN** 連續週數 SHALL 為 1

### Requirement: Display Window
顯示範圍 SHALL 為自當週往回共 12 個週（**含當週**）。動作的最後紀錄落在此視窗內者
SHALL 顯示，落在視窗外者 SHALL NOT 顯示。

視窗 SHALL 僅決定動作是否顯示，SHALL NOT 限制連續週數的計算範圍——
連續週數可往回數超過 12 週。視窗回答「這個動作還在練嗎」，
連續週數回答「它已經連續多久沒換」。

#### Scenario: 視窗外的動作不顯示
- **WHEN** 某動作的最後紀錄早於視窗起點
- **THEN** 該動作 SHALL NOT 出現在結果中

#### Scenario: 視窗起點那一週算在視窗內
- **WHEN** 某動作的最後紀錄落在視窗起點那一週
- **THEN** 該動作 SHALL 出現在結果中

#### Scenario: 連續週數可超過視窗長度
- **WHEN** 某動作連續 17 週有紀錄且最後紀錄在當週
- **THEN** 連續週數 SHALL 為 17，SHALL NOT 被截斷為 12

### Requirement: Result Shape And Ordering
每一列 SHALL 包含動作名稱、連續週數，以及該動作**實際最後訓練日**（`YYYY-MM-DD`）。
最後訓練日 SHALL 為實際有紀錄的日期，SHALL NOT 為該週的週一——
使用者看到的應是自己實際去訓練的那天。

結果 SHALL 依連續週數由大到小排序；連續週數相同時 SHALL 依動作名稱字典序升冪，
以確保順序穩定。

無任何紀錄時 SHALL 回傳空集合，SHALL NOT 拋出例外。
缺少 `date` 或 `exercise` 欄位的紀錄 SHALL 被略過，SHALL NOT 拋出例外。

#### Scenario: 最後訓練日為實際日期
- **WHEN** 某動作最後於週三（該週週一為另一日期）有紀錄
- **THEN** 回傳的最後訓練日 SHALL 為該週三的日期

#### Scenario: 排序
- **WHEN** 存在連續週數為 2、1、1 的三個動作
- **THEN** 連續 2 週者 SHALL 排在最前，其餘兩者 SHALL 依名稱字典序排列

#### Scenario: 無紀錄
- **WHEN** 尚無任何訓練紀錄
- **THEN** SHALL 回傳空集合

### Requirement: Presentation Without Alerting
本能力 SHALL 僅呈現資訊，SHALL NOT 發出通知、警報或需要使用者採取行動的提示。

連續週數 SHALL 以文字顏色分段呈現：4 週以上為警示色、3 週為琥珀色、
其餘為一般文字色。SHALL NOT 使用 pill、emoji、警示 icon 等警報語彙——
本能力不通知，使用警報符號卻無後續行動在語意上自相矛盾。

顏色門檻為視覺分段而非警報門檻，SHALL 可在不影響正確性的前提下調整。

#### Scenario: 高連續週數以警示色顯示
- **WHEN** 某動作連續週數為 6
- **THEN** 該數字 SHALL 以警示色顯示，且 SHALL NOT 伴隨任何警示 icon 或通知

### Requirement: No Exercise Name Aliasing
本能力 SHALL 依 `exercise` 欄位的字串原樣分組，SHALL NOT 合併語意相同但字串不同的動作名稱。

備註（記錄已知取捨，非正規需求）：`Overhead Press` 與 `Barbell Overhead Press`
已知為同一動作，但在此會分成兩列顯示。這是刻意的——讓名稱分岔問題直接呈現在畫面上，
而非靜默影響計算結果。名稱一致性的處理屬於另一項獨立工作。

#### Scenario: 同義動作分開計算
- **WHEN** 資料中同時存在 `Overhead Press` 與 `Barbell Overhead Press`
- **THEN** 兩者 SHALL 各自成為獨立的一列
```

- [ ] **Step 2: 驗證 spec 結構**

Run: `npx openspec validate --specs`
Expected: PASS

- [ ] **Step 3: 更新 todo 文件**

在 `todo_feature_202608.md` 的排名總表中，為本功能加一列並標記完成；
在 #2 的段落註明「核心連續週數計算已由本功能完成，#2 只需加上閾值判斷與通知 UI」。

- [ ] **Step 4: 提醒使用者 commit**

建議訊息：`docs: 歸檔 exercise-streak-overview capability spec`
