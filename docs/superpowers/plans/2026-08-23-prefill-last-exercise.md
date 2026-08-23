# 初次載入預選上次動作 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **補寫聲明**：本計畫於實作完成後補寫，checkbox 已標記為完成。
> 內容如實對應 branch `feat/bw-trend-12week-and-last-exercise` 上實際執行的順序與程式碼。

**Goal:** 打開 Record 頁時自動帶入「上次記錄的動作」，連帶觸發既有機制填入該動作的最後一組重量與次數。

**Architecture:** 把 `getLastSetForExercise` 既有的時間序判定抽成模組層級的 `findLatestSession(sessions, matches)`，新 getter `getLastLoggedExercise` 共用它。RecordView 以 `watch` 等 `sessions` 非同步載入後才套用，並用旗標確保只套用一次。

**Tech Stack:** Vue 3、Pinia、Vitest。

**Spec:** [docs/superpowers/specs/2026-08-23-prefill-last-exercise-design.md](../specs/2026-08-23-prefill-last-exercise-design.md)

## Global Constraints

- 所有註解／文案／文件一律用繁體中文。
- 「最後一筆」的判定規則不得複製第二份：先比 `date`（字典序即時間序），同日比 `createdAt`，任一方缺 `createdAt` 時退回陣列原順序。
- 動作名稱採精確字串比對，不做 trim 或大小寫正規化（沿用既有規格）。
- 預選只在使用者尚未選過動作時套用，且**只套用一次**——送出紀錄不得再覆寫欄位，以維持「送出後欄位保留、可連續送出多組」的既有行為。
- 既有的 9 個 `getLastSetForExercise` 測試在重構期間必須持續通過。
- git commit 由使用者自行操作（不自動下 git 指令）；plan 中的 commit 步驟為手動提醒。
- 測試指令：`npm test`（= `vitest run`）。

---

### Task 1: `getLastLoggedExercise` getter 與共用判定 helper

**Files:**
- Modify: `src/stores/sessionStore.js:71-101`（新增 `findLatestSession`）、`src/stores/sessionStore.js:120-132`（兩個 getter）
- Test: `src/stores/sessionStore.test.js`（檔尾新增 describe）

**Interfaces:**
- Produces: `findLatestSession(sessions, matches?)` → `Session | null`，`matches` 為選填篩選條件，省略時看全部紀錄。
- Produces: `useSessionStore().getLastLoggedExercise` → `string | null`，最後一筆紀錄的動作名稱。
- Consumes: 既有 `toTimestamp(value)`（正規化 `createdAt`，無法解析時回 `null`）。

- [x] **Step 1: 寫失敗測試**

```js
describe('getLastLoggedExercise — 最近一筆紀錄的動作名稱（#11）', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('回傳時間序最後一筆紀錄的動作名稱', () => {
    const store = useSessionStore();
    store.sessions = [
      { id: '1', date: '2026-08-19', exercise: 'Squat', weight: 100, reps: 5, createdAt: 1 },
      { id: '2', date: '2026-08-22', exercise: 'Bench Press', weight: 80, reps: 8, createdAt: 2 },
      { id: '3', date: '2026-08-20', exercise: 'Deadlift', weight: 140, reps: 3, createdAt: 3 },
    ];
    expect(store.getLastLoggedExercise).toBe('Bench Press');
  });

  it('同一日時以 createdAt 判定最後一筆', () => {
    const store = useSessionStore();
    store.sessions = [
      { id: '1', date: '2026-08-22', exercise: 'Squat', weight: 100, reps: 5, createdAt: 10 },
      { id: '2', date: '2026-08-22', exercise: 'Overhead Press', weight: 50, reps: 5, createdAt: 30 },
      { id: '3', date: '2026-08-22', exercise: 'Bench Press', weight: 80, reps: 8, createdAt: 20 },
    ];
    expect(store.getLastLoggedExercise).toBe('Overhead Press');
  });

  it('缺 createdAt 的舊資料以陣列順序為準（後加入者視為較新）', () => {
    const store = useSessionStore();
    store.sessions = [
      { id: '1', date: '2026-08-22', exercise: 'Squat', weight: 100, reps: 5 },
      { id: '2', date: '2026-08-22', exercise: 'Bench Press', weight: 80, reps: 8 },
    ];
    expect(store.getLastLoggedExercise).toBe('Bench Press');
  });

  it('sessions 為空時回傳 null', () => {
    const store = useSessionStore();
    store.sessions = [];
    expect(store.getLastLoggedExercise).toBeNull();
  });
});
```

- [x] **Step 2: 執行測試確認失敗**

Run: `npm test`
Expected: FAIL，四題皆 `expected undefined to be ...`（getter 不存在）。

- [x] **Step 3: 抽出共用 helper**

在 `src/stores/sessionStore.js` 的 `export const useSessionStore` 之前加入：

```js
function findLatestSession(sessions, matches) {
    let best = null;
    let bestIdx = -1;
    let bestTs = null;

    (sessions || []).forEach((session, idx) => {
        if (!session || !session.date) return;
        if (matches && !matches(session)) return;

        const ts = toTimestamp(session.createdAt);

        if (best === null) {
            best = session; bestIdx = idx; bestTs = ts;
            return;
        }

        let isNewer;
        if (session.date !== best.date) {
            isNewer = session.date > best.date;
        } else if (ts !== null && bestTs !== null) {
            isNewer = ts > bestTs;
        } else {
            isNewer = idx > bestIdx;
        }

        if (isNewer) { best = session; bestIdx = idx; bestTs = ts; }
    });

    return best;
}
```

- [x] **Step 4: 兩個 getter 改用 helper**

```js
        getLastSetForExercise: (state) => (exerciseName) => {
            if (!exerciseName) return null;
            const best = findLatestSession(state.sessions, s => s.exercise === exerciseName);
            return best ? { weight: best.weight, reps: best.reps } : null;
        },

        // 最近一筆訓練紀錄的動作名稱，供記錄表單初次載入時預選上次練的動作。
        // 沿用與「最後一組」相同的時間序判定，兩者永遠指向同一筆紀錄。
        getLastLoggedExercise: (state) => {
            const best = findLatestSession(state.sessions);
            return best ? (best.exercise || null) : null;
        },
```

- [x] **Step 5: 執行測試確認通過**

Run: `npm test`
Expected: PASS。新增的 4 題通過，且既有 9 題 `getLastSetForExercise` 測試仍全綠——它們是這次重構的安全網。

- [x] **Step 6: Commit（手動）**

```bash
git add src/stores/sessionStore.js src/stores/sessionStore.test.js
git commit -m "feat: 新增 getLastLoggedExercise 並抽出共用的最後一筆判定"
```

---

### Task 2: RecordView 初次載入預選

**Files:**
- Modify: `src/views/RecordView.vue:55-69`

**Interfaces:**
- Consumes: Task 1 的 `sessionStore.getLastLoggedExercise`。
- Consumes: 既有 `watch(() => form.exercise, ...)`——設定 `form.exercise` 會連帶帶入重量與次數，本任務不需重複實作。

- [x] **Step 1: 加入預選 watch**

插在 `const savedSessions = computed(...)` 之前：

```js
// #11：初次載入時預選「上次記錄的動作」，讓打開記錄頁就已經是上次的最後一組。
// sessions 是 onMounted 後才非同步取回，元件掛載當下仍是空陣列，
// 因此用 watch 等資料到位，不能在 onMounted 裡直接設定。
// 只在使用者尚未選過動作時套用，且僅套用一次——送出紀錄會讓
// getLastLoggedExercise 改變，但那時不得再覆寫欄位，以維持
// 「送出後欄位保留、可連續送出同一動作多組」的既有行為。
let exercisePrefilled = false;
watch(() => sessionStore.getLastLoggedExercise, (lastExercise) => {
  if (exercisePrefilled || !lastExercise) return;
  exercisePrefilled = true;
  // 設定 form.exercise 會觸發上面的 watch，連帶帶入該動作的最後一組重量與次數。
  if (!form.exercise) form.exercise = lastExercise;
}, { immediate: true });
```

用旗標而非 `watch` 的 stop handle：配合 `immediate: true` 時，
在 setup 階段呼叫尚未賦值的 stop handle 會落入 TDZ 而拋錯
（資料已在 store 裡、例如由其他分頁切回時就會踩到）。

- [x] **Step 2: 驗證測試與 build 皆通過**

Run: `npm test && npm run build`
Expected: 38 tests PASS、`✓ built`。

- [x] **Step 3: Commit（手動）**

```bash
git add src/views/RecordView.vue
git commit -m "feat: 記錄頁初次載入預選上次記錄的動作"
```

---

## 尚未完成

- `openspec/specs/record-form-prefill/spec.md` 為 `MODIFIED`：
  `Requirement: Prefill Triggers Only On Exercise Change` 目前寫著
  「頁面初次載入時所選動作為空，系統 SHALL NOT 因此清空任何欄位」，
  並有 Scenario「初次載入不清空欄位」，與本功能直接牴觸，需一併修改。
  已徵詢使用者，待確認後再改。
- RecordView 的預選時序無測試覆蓋：前端元件測試基礎設施尚未建立
  （`todo_feature_202608.md` 項目 #10）。
