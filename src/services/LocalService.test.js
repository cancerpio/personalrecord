import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalService, normalizeLegacyExerciseNames } from './LocalService';

// node 環境沒有 localStorage，用最小的記憶體版本替代。
function installLocalStorage(initial = {}) {
  const store = { ...initial };
  const mock = {
    getItem: vi.fn((k) => (k in store ? store[k] : null)),
    setItem: vi.fn((k, v) => { store[k] = v; }),
    removeItem: vi.fn((k) => { delete store[k]; }),
    _store: store
  };
  globalThis.localStorage = mock;
  return mock;
}

const KEY = 'PR_SESSIONS';

describe('normalizeLegacyExerciseNames', () => {
  it('把舊名 Squat 轉成 High Bar Squat 並回報有變動', () => {
    const { sessions, changed } = normalizeLegacyExerciseNames([
      { id: '1', date: '2026-08-01', exercise: 'Squat', weight: 100, reps: 5 }
    ]);
    expect(changed).toBe(true);
    expect(sessions[0].exercise).toBe('High Bar Squat');
  });

  it('轉換時保留該筆紀錄的其他欄位', () => {
    const { sessions } = normalizeLegacyExerciseNames([
      { id: '1', date: '2026-08-01', exercise: 'Squat', weight: 100, reps: 5, sets: 3, rtype: '3RM' }
    ]);
    expect(sessions[0]).toEqual({
      id: '1', date: '2026-08-01', exercise: 'High Bar Squat', weight: 100, reps: 5, sets: 3, rtype: '3RM'
    });
  });

  it('已經是 High Bar Squat 時不視為變動（冪等）', () => {
    const input = [{ id: '1', date: '2026-08-01', exercise: 'High Bar Squat', weight: 100, reps: 5 }];
    const { sessions, changed } = normalizeLegacyExerciseNames(input);
    expect(changed).toBe(false);
    expect(sessions[0].exercise).toBe('High Bar Squat');
  });

  it('不動其他動作，包含 Low Bar Squat', () => {
    const { sessions, changed } = normalizeLegacyExerciseNames([
      { id: '1', exercise: 'Bench Press' },
      { id: '2', exercise: 'Low Bar Squat' }
    ]);
    expect(changed).toBe(false);
    expect(sessions.map(s => s.exercise)).toEqual(['Bench Press', 'Low Bar Squat']);
  });

  it('空陣列不視為變動', () => {
    expect(normalizeLegacyExerciseNames([]).changed).toBe(false);
  });

  it('缺少 exercise 欄位的紀錄不會爆炸', () => {
    const { sessions, changed } = normalizeLegacyExerciseNames([{ id: '1' }, null]);
    expect(changed).toBe(false);
    expect(sessions).toHaveLength(2);
  });
});

describe('LocalService.getSessions 的舊名歸一化', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('回傳轉換後的資料，並把結果寫回 localStorage', async () => {
    const ls = installLocalStorage({
      [KEY]: JSON.stringify([
        { id: '1', date: '2026-08-01', exercise: 'Squat', weight: 100, reps: 5 },
        { id: '2', date: '2026-08-02', exercise: 'Bench Press', weight: 60, reps: 5 }
      ])
    });
    const sessions = await new LocalService().getSessions();

    expect(sessions.map(s => s.exercise)).toEqual(['High Bar Squat', 'Bench Press']);
    expect(ls.setItem).toHaveBeenCalledTimes(1);
    expect(JSON.parse(ls._store[KEY]).map(s => s.exercise)).toEqual(['High Bar Squat', 'Bench Press']);
  });

  it('沒有舊名時不寫回 localStorage', async () => {
    const ls = installLocalStorage({
      [KEY]: JSON.stringify([{ id: '1', date: '2026-08-01', exercise: 'High Bar Squat', weight: 100, reps: 5 }])
    });
    await new LocalService().getSessions();
    expect(ls.setItem).not.toHaveBeenCalled();
  });

  it('localStorage 沒有資料時回傳空陣列且不寫入', async () => {
    const ls = installLocalStorage();
    await expect(new LocalService().getSessions()).resolves.toEqual([]);
    expect(ls.setItem).not.toHaveBeenCalled();
  });
});
