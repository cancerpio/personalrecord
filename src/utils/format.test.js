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
