import { describe, it, expect } from 'vitest';
import { shuffle, pick, sample } from '../utils/shuffle';
import { createRng } from '../utils/rng';

describe('shuffle（Fisher-Yates 洗牌）', () => {
  it('保持数组长度不变', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffle(arr).length).toBe(arr.length);
  });

  it('保持元素多重集合不变', () => {
    const arr = [1, 2, 3, 4, 5, 5];
    const out = shuffle(arr);
    expect([...out].sort((a, b) => a - b)).toEqual([...arr].sort((a, b) => a - b));
  });

  it('不修改原数组', () => {
    const arr = [1, 2, 3];
    const snapshot = [...arr];
    shuffle(arr);
    expect(arr).toEqual(snapshot);
  });

  it('相同种子可复现', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const a = shuffle(arr, createRng(123));
    const b = shuffle(arr, createRng(123));
    expect(a).toEqual(b);
  });

  it('统计均匀性：元素落在各位置的频率大致均衡', () => {
    const N = 6000;
    const counts = new Array(4).fill(0);
    const arr = [0, 1, 2, 3];
    for (let i = 0; i < N; i++) {
      const out = shuffle(arr);
      counts[out.indexOf(0)]++;
    }
    const expected = N / 4;
    for (let pos = 0; pos < 4; pos++) {
      // 约 5 个标准差容差，纯随机下不应触发
      expect(counts[pos]).toBeGreaterThan(expected - expected * 0.12);
      expect(counts[pos]).toBeLessThan(expected + expected * 0.12);
    }
  });

  it('pick 从数组返回其中一项', () => {
    const arr = ['a', 'b', 'c'];
    const r = pick(arr, createRng(7));
    expect(arr).toContain(r);
  });

  it('sample 返回不重复且不超过 n 项', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = sample(arr, 3, createRng(9));
    expect(out.length).toBe(3);
    expect(new Set(out).size).toBe(3);
    for (const x of out) expect(arr).toContain(x);
  });

  it('sample 的 n 超过数组长度时返回全部', () => {
    const arr = [1, 2, 3];
    const out = sample(arr, 10, createRng(1));
    expect(out.length).toBe(3);
  });
});
