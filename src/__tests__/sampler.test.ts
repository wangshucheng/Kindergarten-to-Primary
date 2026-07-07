/**
 * sampler 抽题测试（node 环境）。
 * 验证 pickRandom / pickN / pickByLevel / pickByTag 的正确性、可复现性与默认 rng。
 */
import { describe, expect, it, vi } from 'vitest';
import { pickRandom, pickN, pickByLevel, pickByTag } from '../data/sampler';
import { createRng } from '../utils/rng';

const arr = ['a', 'b', 'c', 'd', 'e'];

describe('pickRandom', () => {
  it('rng=0 取首项，rng=0.999 取末项', () => {
    expect(pickRandom(arr, () => 0)).toBe('a');
    expect(pickRandom(arr, () => 0.999)).toBe('e');
  });

  it('空数组抛错', () => {
    expect(() => pickRandom([], Math.random)).toThrow();
  });

  it('默认走 Math.random（vi.spyOn 可观测）', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(pickRandom(arr)).toBe('a');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('pickN', () => {
  it('返回不重复的 n 项', () => {
    const got = pickN(arr, 3, createRng(1));
    expect(got.length).toBe(3);
    expect(new Set(got).size).toBe(3);
  });

  it('n 超过长度时截断为数组长度', () => {
    expect(pickN(arr, 99, createRng(1)).length).toBe(arr.length);
  });

  it('n 为 0 时返回空数组', () => {
    expect(pickN(arr, 0, createRng(1))).toEqual([]);
  });
});

describe('pickByLevel', () => {
  it('仅返回指定 level 的项', () => {
    const data = [
      { level: 1, v: 'x' },
      { level: 2, v: 'y' },
      { level: 1, v: 'z' },
    ];
    const got = pickByLevel(data, 1, createRng(2));
    expect(got.length).toBe(2);
    expect(got.every((x) => x.level === 1)).toBe(true);
  });
});

describe('pickByTag', () => {
  it('仅返回含指定 tag 的项', () => {
    const data = [
      { tags: ['fruit'], v: 'a' },
      { tags: ['veg'], v: 'b' },
      { tags: ['fruit', 'veg'], v: 'c' },
    ];
    const got = pickByTag(data, 'fruit', createRng(3));
    expect(got.length).toBe(2);
    expect(got.every((x) => x.tags!.includes('fruit'))).toBe(true);
  });
});

describe('可复现性', () => {
  it('相同种子产出相同序列', () => {
    const a = pickN(arr, 5, createRng(42));
    const b = pickN(arr, 5, createRng(42));
    expect(a).toEqual(b);
  });
});
