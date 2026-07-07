/**
 * matchDetector 纯逻辑测试（node 环境）。
 * 验证 findRuns / detectMatch3 / isAdjacent。
 */
import { describe, expect, it } from 'vitest';
import { findRuns, detectMatch3, isAdjacent } from '../games/_shared/matchDetector';

describe('findRuns', () => {
  it('连续相同段长度 >= 2 才计入', () => {
    expect(findRuns(['a', 'a', 'a'])).toEqual([[0, 1, 2]]);
    expect(findRuns(['a', 'b', 'a', 'a'])).toEqual([[2, 3]]);
    expect(findRuns(['a', 'b', 'c'])).toEqual([]);
    expect(findRuns(['a', 'a', 'b', 'b'])).toEqual([[0, 1], [2, 3]]);
  });

  it('支持自定义相等判定', () => {
    const eq = (a: { k: number }, b: { k: number }) => a.k === b.k;
    expect(findRuns([{ k: 1 }, { k: 1 }, { k: 2 }], eq)).toEqual([[0, 1]]);
  });
});

describe('detectMatch3', () => {
  it('横向三连', () => {
    const g = [
      ['x', 'x', 'x'],
      ['a', 'b', 'c'],
    ];
    const m = detectMatch3(g);
    expect(m).toContainEqual({ row: 0, col: 0 });
    expect(m).toContainEqual({ row: 0, col: 1 });
    expect(m).toContainEqual({ row: 0, col: 2 });
    expect(m.length).toBe(3);
  });

  it('纵向三连', () => {
    const g = [
      ['x', 'a', 'b'],
      ['x', 'c', 'd'],
      ['x', 'e', 'f'],
    ];
    const m = detectMatch3(g);
    expect(m).toContainEqual({ row: 0, col: 0 });
    expect(m).toContainEqual({ row: 1, col: 0 });
    expect(m).toContainEqual({ row: 2, col: 0 });
    expect(m.length).toBe(3);
  });

  it('不足三连不计', () => {
    const g = [
      ['x', 'x', 'y'],
      ['a', 'b', 'c'],
    ];
    expect(detectMatch3(g).length).toBe(0);
  });

  it('横纵交叉去重', () => {
    const g = [
      ['x', 'x', 'x'],
      ['x', 'a', 'b'],
      ['x', 'c', 'd'],
    ];
    const m = detectMatch3(g);
    const keys = new Set(m.map((c) => `${c.row},${c.col}`));
    expect(keys.size).toBe(m.length); // 坐标唯一
    expect(m.length).toBe(5); // 第0行3个 + 第0列2个
  });
});

describe('isAdjacent', () => {
  it('正交相邻', () => {
    expect(isAdjacent({ row: 0, col: 0 }, { row: 0, col: 1 })).toBe(true);
    expect(isAdjacent({ row: 0, col: 0 }, { row: 1, col: 0 })).toBe(true);
  });

  it('非相邻或自身', () => {
    expect(isAdjacent({ row: 0, col: 0 }, { row: 1, col: 1 })).toBe(false);
    expect(isAdjacent({ row: 0, col: 0 }, { row: 0, col: 0 })).toBe(false);
    expect(isAdjacent({ row: 0, col: 0 }, { row: 0, col: 2 })).toBe(false);
  });
});
