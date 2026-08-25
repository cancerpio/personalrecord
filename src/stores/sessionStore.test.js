import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

// 避免透過 api.js 連帶載入 @line/liff（瀏覽器專用）；getter 直接讀 state，不呼叫 api。
vi.mock('../services/api', () => ({ api: {} }));

import { useSessionStore } from './sessionStore.js';

// 與視覺稿相同的 16 週資料：週一結束於 2026-07-06（對 2026-07-08 而言為當週）。
function buildDataset() {
  const volumes = [9200, 10100, 8800, 11200, 10500, 12100, 11800, 9900, 13200, 12600, 11100, 13800, 12900, 14200, 13600, 4200];
  const bws = [76.2, 76.4, 76.0, 76.6, 76.3, 76.8, 77.1, null, 77.4, 77.2, 77.6, 77.9, 78.1, 77.8, 78.3, 78.0];
  const cur = Date.UTC(2026, 6, 6); // 2026-07-06 (Monday)
  const sessions = [];
  const body = [];
  for (let i = 0; i < 16; i++) {
    const d = new Date(cur - (15 - i) * 7 * 86400000);
    const ds = d.toISOString().slice(0, 10);
    sessions.push({ id: 's' + i, date: ds, exercise: 'Squat', reps: 1, weight: volumes[i] });
    if (bws[i] != null) body.push({ id: 'b' + i, date: ds, bodyWeight: bws[i] });
  }
  return { sessions, body };
}

describe('weeklyTrainingVolumeInfo — 容積趨勢：當週總量 vs 12 週基準', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-08T12:00:00Z')); // 當週 = 2026-07-06 那週
  });
  afterEach(() => { vi.useRealTimers(); });

  const sess = (date, weight) => ({ id: date + '-' + weight, date, exercise: 'Squat', reps: 1, weight });

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

  it('當週總量高於基準 5% 以上 → 上升', () => {
    const store = useSessionStore();
    store.sessions = [
      sess('2026-06-29', 12000), // 基準 1000
      sess('2026-07-06', 2000),
    ];
    const info = store.weeklyTrainingVolumeInfo;
    expect(info.currentVolume).toBe(2000);
    expect(info.trend).toBe('up');
    expect(info.trendPct).toBe(100);
  });

  it('當週為進行中的部分加總、低於基準 → 下降（知情接受的週初偏低）', () => {
    const store = useSessionStore();
    store.sessions = [
      sess('2026-06-29', 120000), // 基準 10000
      sess('2026-07-06', 4200),
    ];
    const info = store.weeklyTrainingVolumeInfo;
    expect(info.trend).toBe('down');
    expect(info.trendPct).toBe(-58);
  });

  it('當週落在基準 ±5% 內 → 持平', () => {
    const store = useSessionStore();
    store.sessions = [
      sess('2026-06-29', 120000), // 基準 10000
      sess('2026-07-06', 10200),  // +2%
    ];
    const info = store.weeklyTrainingVolumeInfo;
    expect(info.trend).toBe('stable');
    expect(info.statusLabel).toBe('持平');
  });

  it('視窗內完全沒有訓練紀錄 → 首週訓練中', () => {
    const store = useSessionStore();
    store.sessions = [sess('2026-07-06', 1000)];
    expect(store.weeklyTrainingVolumeInfo.statusLabel).toBe('首週訓練中');
  });
});

describe('weeklyTrainingVolumeInfo — 當週平均體重與體重趨勢（vs 12 週基準）', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-08T12:00:00Z'));
  });
  afterEach(() => { vi.useRealTimers(); });

  const bw = (date, bodyWeight) => ({ id: date + '-' + bodyWeight, date, bodyWeight });

  it('基準只平均「視窗內有體重紀錄的週」，空白週跳過而非補 0', () => {
    const store = useSessionStore();
    store.bodyMetrics = [
      bw('2026-06-29', 76.0), // 視窗 12 週內唯一有紀錄的完整週
      bw('2026-07-06', 77.0), // 當週
    ];
    const info = store.weeklyTrainingVolumeInfo;
    expect(info.currentBodyWeight).toBeCloseTo(77.0, 5);
    expect(info.bodyWeightDelta).toBeCloseTo(1.0, 5); // 基準 76.0，而非 76.0/12
    expect(info.bodyWeightTrend).toBe('up');
  });

  it('超出 12 週視窗的體重不計入基準', () => {
    const store = useSessionStore();
    store.bodyMetrics = [
      bw('2026-04-06', 100.0), // 視窗外
      bw('2026-06-29', 76.0),
      bw('2026-07-06', 77.0),
    ];
    expect(store.weeklyTrainingVolumeInfo.bodyWeightDelta).toBeCloseTo(1.0, 5);
  });

  it('當週有多筆體重 → 取當週平均後再與基準比較', () => {
    const store = useSessionStore();
    store.bodyMetrics = [
      bw('2026-06-29', 76.0),
      bw('2026-07-06', 77.8),
      bw('2026-07-08', 78.2), // 當週平均 78.0
    ];
    const info = store.weeklyTrainingVolumeInfo;
    expect(info.currentBodyWeight).toBeCloseTo(78.0, 5);
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
    const info = store.weeklyTrainingVolumeInfo;
    expect(info.bodyWeightDelta).toBe(0.6);
    expect(info.bodyWeightTrend).toBe('up');
  });

  it('差距四捨五入後為 -0.6 → 下降', () => {
    const store = useSessionStore();
    store.bodyMetrics = [bw('2026-06-29', 76.0), bw('2026-07-06', 75.4)];
    const info = store.weeklyTrainingVolumeInfo;
    expect(info.bodyWeightDelta).toBe(-0.6);
    expect(info.bodyWeightTrend).toBe('down');
  });

  it('bodyWeightDelta 已四捨五入到小數一位，且不得為 -0', () => {
    const store = useSessionStore();
    store.bodyMetrics = [bw('2026-06-29', 76.0), bw('2026-07-06', 75.96)]; // 差 -0.04
    const info = store.weeklyTrainingVolumeInfo;
    expect(Object.is(info.bodyWeightDelta, -0)).toBe(false);
    expect(info.bodyWeightDelta).toBe(0);
    expect(info.bodyWeightTrend).toBe('stable');
  });

  it('無體重紀錄 → currentBodyWeight 為 null、趨勢 none', () => {
    const store = useSessionStore();
    store.sessions = [];
    store.bodyMetrics = [];
    const info = store.weeklyTrainingVolumeInfo;
    expect(info.currentBodyWeight).toBeNull();
    expect(info.bodyWeightTrend).toBe('none');
  });

  it('視窗內沒有任何完整週體重（只有當週有）→ 趨勢 none', () => {
    const store = useSessionStore();
    store.bodyMetrics = [bw('2026-07-06', 77.0)];
    const info = store.weeklyTrainingVolumeInfo;
    expect(info.currentBodyWeight).toBeCloseTo(77.0, 5);
    expect(info.bodyWeightTrend).toBe('none');
    expect(info.bodyWeightDelta).toBeNull();
  });
});

describe('trailing12WeekVolumeInfo — 每週平均體重', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-08T12:00:00Z'));
  });
  afterEach(() => { vi.useRealTimers(); });

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

  it('average 為 12 週基準（不含當週），與標頭 chip 的基準同值', () => {
    const store = useSessionStore();
    store.sessions = [
      { id: 'a', date: '2026-06-29', exercise: 'Squat', reps: 1, weight: 12000 },
      { id: 'b', date: '2026-07-06', exercise: 'Squat', reps: 1, weight: 999999 }, // 當週不計入
    ];
    expect(store.trailing12WeekVolumeInfo.average).toBe(1000);
    expect(store.trailing12WeekVolumeInfo.average).toBe(store.weeklyTrainingVolumeInfo.averageVolume);
  });

  it('該週多筆體重取平均', () => {
    const store = useSessionStore();
    store.bodyMetrics = [
      { id: '1', date: '2026-06-29', bodyWeight: 77.8 },
      { id: '2', date: '2026-07-01', bodyWeight: 78.2 }
    ];
    const t = store.trailing12WeekVolumeInfo;
    const wk = t.weeks.find(w => w.monday === '2026-06-29');
    expect(wk.avgBodyWeight).toBeCloseTo(78.0, 5); // (77.8 + 78.2) / 2
  });
});

describe('getLastSetForExercise — 帶出該動作的最後一組', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('跨日時取最新日期的紀錄', () => {
    const store = useSessionStore();
    store.sessions = [
      { id: '1', date: '2026-08-19', exercise: 'Squat', weight: 100, reps: 5, createdAt: 1 },
      { id: '2', date: '2026-08-22', exercise: 'Squat', weight: 110, reps: 3, createdAt: 2 },
      { id: '3', date: '2026-08-20', exercise: 'Squat', weight: 105, reps: 5, createdAt: 3 },
    ];
    expect(store.getLastSetForExercise('Squat')).toEqual({ weight: 110, reps: 3 });
  });

  it('同一天多組時取 createdAt 最後的那一組（而非最重的）', () => {
    const store = useSessionStore();
    store.sessions = [
      { id: '1', date: '2026-08-22', exercise: 'Squat', weight: 100, reps: 5, createdAt: 10 },
      { id: '2', date: '2026-08-22', exercise: 'Squat', weight: 120, reps: 1, createdAt: 20 },
      { id: '3', date: '2026-08-22', exercise: 'Squat', weight: 90, reps: 8, createdAt: 30 },
    ];
    expect(store.getLastSetForExercise('Squat')).toEqual({ weight: 90, reps: 8 });
  });

  it('只看指定動作，不受其他動作影響', () => {
    const store = useSessionStore();
    store.sessions = [
      { id: '1', date: '2026-08-19', exercise: 'Squat', weight: 100, reps: 5, createdAt: 1 },
      { id: '2', date: '2026-08-22', exercise: 'Bench Press', weight: 80, reps: 8, createdAt: 2 },
    ];
    expect(store.getLastSetForExercise('Squat')).toEqual({ weight: 100, reps: 5 });
    expect(store.getLastSetForExercise('Bench Press')).toEqual({ weight: 80, reps: 8 });
  });

  it('該動作沒有任何紀錄時回傳 null', () => {
    const store = useSessionStore();
    store.sessions = [
      { id: '1', date: '2026-08-19', exercise: 'Squat', weight: 100, reps: 5, createdAt: 1 },
    ];
    expect(store.getLastSetForExercise('Lunge')).toBeNull();
  });

  it('sessions 為空時回傳 null', () => {
    const store = useSessionStore();
    store.sessions = [];
    expect(store.getLastSetForExercise('Squat')).toBeNull();
  });

  it('動作名稱為空字串時回傳 null', () => {
    const store = useSessionStore();
    store.sessions = [
      { id: '1', date: '2026-08-19', exercise: 'Squat', weight: 100, reps: 5, createdAt: 1 },
    ];
    expect(store.getLastSetForExercise('')).toBeNull();
  });

  it('createdAt 為 ISO 字串（後端模式）時同樣正確排序', () => {
    const store = useSessionStore();
    store.sessions = [
      { id: '1', date: '2026-08-22', exercise: 'Squat', weight: 100, reps: 5, createdAt: '2026-08-22T10:00:00.000Z' },
      { id: '2', date: '2026-08-22', exercise: 'Squat', weight: 115, reps: 2, createdAt: '2026-08-22T11:30:00.000Z' },
      { id: '3', date: '2026-08-22', exercise: 'Squat', weight: 95, reps: 6, createdAt: '2026-08-22T09:15:00.000Z' },
    ];
    expect(store.getLastSetForExercise('Squat')).toEqual({ weight: 115, reps: 2 });
  });

  it('缺 createdAt 的舊資料以陣列順序為準（後加入者視為較新）', () => {
    const store = useSessionStore();
    store.sessions = [
      { id: '1', date: '2026-08-22', exercise: 'Squat', weight: 100, reps: 5 },
      { id: '2', date: '2026-08-22', exercise: 'Squat', weight: 105, reps: 4 },
    ];
    expect(store.getLastSetForExercise('Squat')).toEqual({ weight: 105, reps: 4 });
  });

  it('同一天中部分有 createdAt、部分沒有時不會拋錯，仍回傳一組結果', () => {
    const store = useSessionStore();
    store.sessions = [
      { id: '1', date: '2026-08-22', exercise: 'Squat', weight: 100, reps: 5 },
      { id: '2', date: '2026-08-22', exercise: 'Squat', weight: 105, reps: 4, createdAt: 500 },
    ];
    const result = store.getLastSetForExercise('Squat');
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('weight');
    expect(result).toHaveProperty('reps');
  });
});

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

// 2026-08-23 回報的實際 bug：畫面顯示「-0.3 kg」，但當週體重其實比上一週高。
// 以下為當時正式資料的體重快照（Firestore body_metrics），用來釘住修正後的結果。
describe('體重趨勢 — 2026-08-23 實際資料回歸', () => {
  const REAL_BODY_WEIGHTS = [
    ['2026-05-26', 80.3], ['2026-05-30', 79.8], ['2026-05-31', 80.0],
    ['2026-06-01', 79.8], ['2026-06-02', 80.3], ['2026-06-03', 80.3], ['2026-06-04', 80.3],
    ['2026-06-05', 80.3], ['2026-06-06', 80.1], ['2026-06-07', 80.2],
    ['2026-06-08', 81.2], ['2026-06-09', 81.2], ['2026-06-10', 81.3], ['2026-06-11', 81.3],
    ['2026-06-12', 80.2], ['2026-06-13', 80.1], ['2026-06-14', 80.3],
    ['2026-06-15', 81.2], ['2026-06-16', 80.4],
    ['2026-07-01', 81.4], ['2026-07-03', 82.6], ['2026-07-05', 82.5],
    ['2026-07-06', 82.5], ['2026-07-07', 82.2], ['2026-07-08', 82.3],
    ['2026-07-16', 82.2], ['2026-07-17', 82.2], ['2026-07-18', 82.3],
    ['2026-07-31', 80.4], ['2026-08-01', 80.1],
    ['2026-08-03', 80.9], ['2026-08-04', 80.2],
    ['2026-08-12', 81.6], ['2026-08-13', 80.9], ['2026-08-14', 80.6], ['2026-08-15', 80.6], ['2026-08-16', 81.7],
    ['2026-08-17', 81.5], ['2026-08-18', 81.0], ['2026-08-19', 80.9],
    ['2026-08-21', 81.6], ['2026-08-22', 80.8], ['2026-08-23', 81.1],
  ];

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-23T12:00:00Z')); // 當週 = 2026-08-17 那週
  });
  afterEach(() => { vi.useRealTimers(); });

  it('當週高於上一完整週，趨勢差值 SHALL NOT 為負', () => {
    const store = useSessionStore();
    store.bodyMetrics = REAL_BODY_WEIGHTS.map(([date, bodyWeight], i) => ({ id: 'b' + i, date, bodyWeight }));

    const info = store.weeklyTrainingVolumeInfo;
    const prevWeek = store.trailing12WeekVolumeInfo.weeks.find(w => w.monday === '2026-08-10');

    expect(prevWeek.avgBodyWeight).toBeCloseTo(81.08, 2); // 8/10–8/16
    expect(info.currentBodyWeight).toBeCloseTo(81.15, 2); // 8/17–8/23
    expect(info.currentBodyWeight).toBeGreaterThan(prevWeek.avgBodyWeight);

    // 12 週基準 81.043（視窗 5/25–8/10 內有紀錄的 10 週）→ 差 +0.107 → 顯示 +0.1
    expect(info.bodyWeightDelta).toBe(0.1);
    expect(info.bodyWeightTrend).toBe('stable');
  });
});

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

  it('錨點是當週：當週沒練但上週有練，仍在持續中', () => {
    const store = useSessionStore();
    store.sessions = [
      s('2026-08-03', 'Deadlift'),
      s('2026-08-10', 'Deadlift'),
      s('2026-08-17', 'Deadlift'),
      // 當週（2026-08-24）沒有練 Deadlift，但只空了一週，仍在容許範圍內
    ];
    expect(store.exerciseStreaks[0].streakWeeks).toBe(3);
  });

  it('停練超過容許空窗的動作歸零，但仍列在清單上', () => {
    const store = useSessionStore();
    store.sessions = [
      // 曾經連續 5 週，但最後一筆距當週已超過兩週
      s('2026-06-01', 'Pull Up'), s('2026-06-08', 'Pull Up'),
      s('2026-06-15', 'Pull Up'), s('2026-06-22', 'Pull Up'),
      s('2026-06-29', 'Pull Up'),
    ];
    // 舊語意會回傳 5（歷史上的連續）；新語意問的是「現在還持續著嗎」
    expect(store.exerciseStreaks).toEqual([
      { exercise: 'Pull Up', streakWeeks: 0, lastDate: '2026-06-29' },
    ]);
  });

  it('只在當週練過時回傳 1', () => {
    const store = useSessionStore();
    store.sessions = [s('2026-08-24', 'Squat')];
    expect(store.exerciseStreaks[0].streakWeeks).toBe(1);
  });

  it('連續週數上限為 12 週，超過仍顯示 12', () => {
    const store = useSessionStore();
    // 從 2026-05-04 那週起連續 17 週，最後一筆落在當週
    const sessions = [];
    for (let i = 0; i < 17; i++) {
      const d = new Date(Date.UTC(2026, 4, 4));
      d.setUTCDate(d.getUTCDate() + i * 7);
      sessions.push(s(d.toISOString().slice(0, 10), 'Squat'));
    }
    store.sessions = sessions;
    expect(store.exerciseStreaks[0].streakWeeks).toBe(12);
  });

  it('很久沒練的動作仍會顯示，連續週數為 0', () => {
    const store = useSessionStore();
    store.sessions = [
      s('2026-08-24', 'Squat'),
      s('2026-05-25', 'Pull Up'),
    ];
    expect(store.exerciseStreaks.map(r => `${r.exercise}:${r.streakWeeks}`))
      .toEqual(['Squat:1', 'Pull Up:0']);
  });

  it('最多只顯示 12 筆，保留最後練到日期最近的那些', () => {
    const store = useSessionStore();
    // 14 個動作，最後練到的日期由新到舊各差一天
    const sessions = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(Date.UTC(2026, 7, 24));
      d.setUTCDate(d.getUTCDate() - i);
      sessions.push(s(d.toISOString().slice(0, 10), `Ex${String(i).padStart(2, '0')}`));
    }
    store.sessions = sessions;
    const rows = store.exerciseStreaks;
    expect(rows).toHaveLength(12);
    expect(rows[0].exercise).toBe('Ex00');   // 2026-08-24，最近
    expect(rows[11].exercise).toBe('Ex11');  // 第 12 筆，Ex12/Ex13 被截掉
  });

  it('依最後練到日期由新到舊排序，連續週數再大也不會排到較新的日期前面', () => {
    const store = useSessionStore();
    store.sessions = [
      s('2026-08-24', 'Ab Wheel'),                                    // 1 週，08-24
      s('2026-08-17', 'Bench Press'), s('2026-08-24', 'Bench Press'), // 2 週，08-24
      // Squat 連續 5 週但最後練到 08-21，仍排在 08-24 那兩個之後
      s('2026-07-20', 'Squat'), s('2026-07-27', 'Squat'),
      s('2026-08-03', 'Squat'), s('2026-08-10', 'Squat'),
      s('2026-08-21', 'Squat'),
    ];
    expect(store.exerciseStreaks.map(r => `${r.exercise}:${r.streakWeeks}:${r.lastDate}`))
      .toEqual([
        'Bench Press:2:2026-08-24',  // 同為 08-24，連續週數較大者在前
        'Ab Wheel:1:2026-08-24',
        'Squat:5:2026-08-21',        // 日期較舊，即使連續 5 週仍排在後面
      ]);
  });

  it('日期與連續週數皆相同時依動作名字典序，確保順序穩定', () => {
    const store = useSessionStore();
    store.sessions = [
      s('2026-08-24', 'Zercher Squat'),
      s('2026-08-24', 'Ab Wheel'),
    ];
    expect(store.exerciseStreaks.map(r => r.exercise)).toEqual(['Ab Wheel', 'Zercher Squat']);
  });

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
});
