import { describe, it, expect } from 'vitest';
import { createRng, randomInt, weightedPick } from '../utils/rng';

describe('rng（可种子随机）', () => {
  it('同种子产生相同序列', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('不同种子大概率不同', () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it('返回值落在 [0,1) 区间', () => {
    const r = createRng(7);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('randomInt 返回闭区间 [min,max] 内整数', () => {
    const r = createRng(13);
    for (let i = 0; i < 200; i++) {
      const v = randomInt(r, 3, 9);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(9);
    }
  });

  it('randomInt 边界值（最小/最大）均可被取到', () => {
    const r = createRng(0);
    let seenMin = false;
    let seenMax = false;
    for (let i = 0; i < 500; i++) {
      const v = randomInt(r, 1, 9);
      if (v === 1) seenMin = true;
      if (v === 9) seenMax = true;
    }
    expect(seenMin).toBe(true);
    expect(seenMax).toBe(true);
  });

  it('weightedPick 返回数组中的一项', () => {
    const arr = ['x', 'y', 'z'];
    const out = weightedPick(arr, [1, 1, 1], createRng(5));
    expect(arr).toContain(out);
  });
});
