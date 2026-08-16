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

describe('weeklyTrainingVolumeInfo — 趨勢：當週總量 vs 過往完整週平均', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-08T12:00:00Z')); // 當週 = 2026-07-06 那週
  });
  afterEach(() => { vi.useRealTimers(); });

  const sess = (date, weight) => ({ id: date + '-' + weight, date, exercise: 'Squat', reps: 1, weight });

  it('當週總量高於過往完整週平均 → 上升，trendPct = 當週 vs 平均', () => {
    const store = useSessionStore();
    store.sessions = [
      sess('2026-06-22', 4000), // 完整週
      sess('2026-06-29', 4000), // 完整週（平均 4000）
      sess('2026-07-06', 5000), // 當週即時總量
    ];
    const info = store.weeklyTrainingVolumeInfo;
    expect(info.currentVolume).toBe(5000);
    expect(info.averageVolume).toBe(4000);
    expect(info.trend).toBe('up');
    expect(info.trendPct).toBe(25); // (5000/4000 - 1) * 100
  });

  it('當週為進行中的部分加總、低於平均 → 下降（知情接受的週初偏低）', () => {
    const store = useSessionStore();
    store.sessions = [
      sess('2026-06-22', 10000),
      sess('2026-06-29', 10000), // 平均 10000
      sess('2026-07-06', 4200),  // 當週部分加總，遠低於平均
    ];
    const info = store.weeklyTrainingVolumeInfo;
    expect(info.trend).toBe('down');
    expect(info.trendPct).toBe(-58); // (4200/10000 - 1) * 100
  });

  it('當週落在平均 ±5% 內 → 持平', () => {
    const store = useSessionStore();
    store.sessions = [
      sess('2026-06-29', 10000), // 完整週
      sess('2026-07-06', 10200), // 當週 +2%，在門檻內
    ];
    const info = store.weeklyTrainingVolumeInfo;
    expect(info.trend).toBe('stable');
    expect(info.statusLabel).toBe('持平');
  });

  it('只有一個完整週也直接比較，不再固定持平', () => {
    const store = useSessionStore();
    store.sessions = [
      sess('2026-06-29', 5000), // 唯一完整週
      sess('2026-07-06', 8000), // 當週高於它 → 上升
    ];
    expect(store.weeklyTrainingVolumeInfo.trend).toBe('up');
  });

  it('沒有任何完整週 → 首週訓練中', () => {
    const store = useSessionStore();
    store.sessions = [sess('2026-07-06', 1000)];
    expect(store.weeklyTrainingVolumeInfo.statusLabel).toBe('首週訓練中');
  });
});

describe('weeklyTrainingVolumeInfo — 當週平均體重與體重趨勢（vs 過往完整週平均）', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-08T12:00:00Z'));
  });
  afterEach(() => { vi.useRealTimers(); });

  const bw = (date, bodyWeight) => ({ id: date + '-' + bodyWeight, date, bodyWeight });

  it('當週平均體重高於過往完整週平均 >0.3kg → 上升（中性方向）', () => {
    const store = useSessionStore();
    store.bodyMetrics = [
      bw('2026-06-22', 76.0),
      bw('2026-06-29', 76.0), // 過往完整週平均 76.0
      bw('2026-07-06', 77.0), // 當週 +1.0
    ];
    const info = store.weeklyTrainingVolumeInfo;
    expect(info.currentBodyWeight).toBeCloseTo(77.0, 5);
    expect(info.bodyWeightTrend).toBe('up');
    expect(info.bodyWeightDelta).toBeCloseTo(1.0, 5);
  });

  it('當週平均體重與過往平均差在 ±0.3kg 內 → 持平', () => {
    const store = useSessionStore();
    store.bodyMetrics = [
      bw('2026-06-29', 76.0),
      bw('2026-07-06', 76.1), // 差 0.1kg，在門檻內
    ];
    expect(store.weeklyTrainingVolumeInfo.bodyWeightTrend).toBe('stable');
  });

  it('當週有多筆體重 → 取當週平均後再與過往平均比較', () => {
    const store = useSessionStore();
    store.bodyMetrics = [
      bw('2026-06-29', 76.0), // 過往
      bw('2026-07-06', 77.8), // 當週兩筆
      bw('2026-07-08', 78.2), // → 當週平均 78.0
    ];
    const info = store.weeklyTrainingVolumeInfo;
    expect(info.currentBodyWeight).toBeCloseTo(78.0, 5);
    expect(info.bodyWeightTrend).toBe('up');
  });

  it('無體重紀錄 → currentBodyWeight 為 null、趨勢 none', () => {
    const store = useSessionStore();
    store.sessions = [];
    store.bodyMetrics = [];
    const info = store.weeklyTrainingVolumeInfo;
    expect(info.currentBodyWeight).toBeNull();
    expect(info.bodyWeightTrend).toBe('none');
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
