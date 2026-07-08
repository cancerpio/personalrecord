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

describe('weeklyTrainingVolumeInfo — 趨勢 2A（完整週對完整週）', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-08T12:00:00Z'));
  });
  afterEach(() => { vi.useRealTimers(); });

  it('容積趨勢＝上一完整週 vs 前期各週平均（上升 18%），當週為部分加總不參與比較', () => {
    const store = useSessionStore();
    const { sessions, body } = buildDataset();
    store.sessions = sessions;
    store.bodyMetrics = body;

    const info = store.weeklyTrainingVolumeInfo;
    expect(info.currentVolume).toBe(4200); // 當週即時（部分）容積作為大數字
    expect(info.trend).toBe('usssp');
    expect(info.trendPct).toBe(18);
  });

  it('當週低量不影響趨勢：週初部分加總偏低仍判定上升', () => {
    const store = useSessionStore();
    const { sessions } = buildDataset(); // 當週僅 4200，遠低於歷史，但上一完整週高
    store.sessions = sessions;
    expect(store.weeklyTrainingVolumeInfo.trend).toBe('up');
  });

  it('只有一個完整週 → 持平（stable）', () => {
    const store = useSessionStore();
    store.sessions = [
      { id: 'a', date: '2026-06-29', exercise: 'Squat', reps: 1, weight: 5000 }, // 唯一完整週
      { id: 'b', date: '2026-07-06', exercise: 'Squat', reps: 1, weight: 1000 }  // 當週
    ];
    expect(store.weeklyTrainingVolumeInfo.trend).toBe('stable');
    expect(store.weeklyTrainingVolumeInfo.statusLabel).toBe('持平');
  });

  it('沒有任何完整週 → 首週訓練中', () => {
    const store = useSessionStore();
    store.sessions = [{ id: 'a', date: '2026-07-06', exercise: 'Squat', reps: 1, weight: 1000 }];
    expect(store.weeklyTrainingVolumeInfo.statusLabel).toBe('首週訓練中');
  });
});

describe('weeklyTrainingVolumeInfo — 當週平均體重與體重趨勢', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-08T12:00:00Z'));
  });
  afterEach(() => { vi.useRealTimers(); });

  it('當週平均體重＝78.0，趨勢採 2A 且為中性方向（up）', () => {
    const store = useSessionStore();
    const { sessions, body } = buildDataset();
    store.sessions = sessions;
    store.bodyMetrics = body;

    const info = store.weeklyTrainingVolumeInfo;
    expect(info.currentBodyWeight).toBeCloseTo(78.0, 5);
    expect(info.bodyWeightTrend).toBe('up');
    expect(info.bodyWeightDelta).toBeGreaterThan(0.3); // 超過 ±0.3kg 門檻
  });

  it('無體重紀錄 → currentBodyWeight 為 null、趨勢 none', () => {
    const store = useSessionStore();
    const { sessions } = buildDataset();
    store.sessions = sessions;
    store.bodyMetrics = [];
    const info = store.weeklyTrainingVolumeInfo;
    expect(info.currentBodyWeight).toBeNull();
    expect(info.bodyWeightTrend).toBe('none');
  });
});

describe('trailing16WeekVolumeInfo — 每週平均體重', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-08T12:00:00Z'));
  });
  afterEach(() => { vi.useRealTimers(); });

  it('固定 16 筆、缺值週為 null、當週 avgBodyWeight 正確', () => {
    const store = useSessionStore();
    const { sessions, body } = buildDataset();
    store.sessions = sessions;
    store.bodyMetrics = body;

    const t = store.trailing16WeekVolumeInfo;
    expect(t.weeks).toHaveLength(16);
    expect(t.weeks[7].avgBodyWeight).toBeNull();       // 第 8 週（index 7）無體重紀錄
    expect(t.weeks[15].isCurrent).toBe(true);
    expect(t.weeks[15].avgBodyWeight).toBeCloseTo(78.0, 5);
    expect(t.weeks[0].avgBodyWeight).toBeCloseTo(76.2, 5);
  });

  it('該週多筆體重取平均', () => {
    const store = useSessionStore();
    store.bodyMetrics = [
      { id: '1', date: '2026-06-29', bodyWeight: 77.8 },
      { id: '2', date: '2026-07-01', bodyWeight: 78.2 }
    ];
    const t = store.trailing16WeekVolumeInfo;
    const wk = t.weeks.find(w => w.monday === '2026-06-29');
    expect(wk.avgBodyWeight).toBeCloseTo(78.0, 5); // (77.8 + 78.2) / 2
  });
});
