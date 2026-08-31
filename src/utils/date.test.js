import { describe, it, expect, vi, afterEach } from 'vitest';
import { todayLocalISO, shiftDays } from './date.js';

// 這些測試依賴時區為 Asia/Taipei（UTC+8），由 vitest.config.js 釘住。
describe('todayLocalISO', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('回傳本地日曆上的今天', () => {
    expect(todayLocalISO(new Date('2026-08-25T12:00:00Z'))).toBe('2026-08-25');
  });

  it('本地深夜時回傳本地的今天，不是 UTC 的昨天', () => {
    // UTC 2026-08-25 16:30 = 台北 2026-08-26 00:30
    const midnightish = new Date('2026-08-25T16:30:00Z');
    expect(midnightish.toISOString().slice(0, 10)).toBe('2026-08-25'); // 舊寫法會這樣錯
    expect(todayLocalISO(midnightish)).toBe('2026-08-26');
  });

  it('月與日補零成兩位數', () => {
    expect(todayLocalISO(new Date('2026-01-05T12:00:00Z'))).toBe('2026-01-05');
  });

  it('跨年邊界時年份跟著本地日期走', () => {
    // UTC 2025-12-31 16:30 = 台北 2026-01-01 00:30
    expect(todayLocalISO(new Date('2025-12-31T16:30:00Z'))).toBe('2026-01-01');
  });

  it('省略參數時取當下時間', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-25T16:30:00Z'));
    expect(todayLocalISO()).toBe('2026-08-26');
  });
});

describe('shiftDays', () => {
  it('往前後平移天數', () => {
    expect(shiftDays('2026-08-31', -1)).toBe('2026-08-30');
    expect(shiftDays('2026-08-30', 1)).toBe('2026-08-31');
    expect(shiftDays('2026-08-30', 0)).toBe('2026-08-30');
  });

  it('跨月邊界', () => {
    expect(shiftDays('2026-09-01', -1)).toBe('2026-08-31');
    expect(shiftDays('2026-08-31', 1)).toBe('2026-09-01');
  });

  it('跨年邊界', () => {
    expect(shiftDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(shiftDays('2025-12-31', 1)).toBe('2026-01-01');
  });

  it('閏年二月', () => {
    expect(shiftDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(shiftDays('2028-03-01', -1)).toBe('2028-02-29');
    expect(shiftDays('2026-02-28', 1)).toBe('2026-03-01'); // 2026 非閏年
  });

  it('月與日補零成兩位數', () => {
    expect(shiftDays('2026-01-10', -1)).toBe('2026-01-09');
  });

  it('是純日曆運算，不受執行環境時區影響', () => {
    // 輸入已是日期字串、不涉及時刻，因此結果與時區無關
    expect(shiftDays('2026-08-30', -7)).toBe('2026-08-23');
  });
});
