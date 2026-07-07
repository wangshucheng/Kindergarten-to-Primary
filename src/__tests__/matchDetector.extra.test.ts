/**
 * QA 补充测试（严过关）· matchDetector 边界强化。
 * 工程师自测已覆盖「横/纵三连、不足三连、交叉去重、相邻判定」，
 * 但「单行 / 单列 / L 形（不应误判为三连）」边界未断言。
 */
import { describe, expect, it } from 'vitest';
import { detectMatch3, isAdjacent } from '../games/_shared/matchDetector';

describe('detectMatch3 · 单行', () => {
  it('仅一行且含三连，应被检出', () => {
    const g = [['x', 'x', 'x', 'y']];
    const m = detectMatch3(g);
    expect(m).toContainEqual({ row: 0, col: 0 });
    expect(m).toContainEqual({ row: 0, col: 1 });
    expect(m).toContainEqual({ row: 0, col: 2 });
    expect(m.length).toBe(3);
  });
  it('仅一行且无三连，返回空', () => {
    expect(detectMatch3([['x', 'x', 'y', 'z']])).toEqual([]);
  });
});

describe('detectMatch3 · 单列', () => {
  it('仅一列且含三连，应被检出', () => {
    const g = [['x'], ['x'], ['x'], ['y']];
    const m = detectMatch3(g);
    expect(m).toContainEqual({ row: 0, col: 0 });
    expect(m).toContainEqual({ row: 1, col: 0 });
    expect(m).toContainEqual({ row: 2, col: 0 });
    expect(m.length).toBe(3);
  });
});

describe('detectMatch3 · L 形不应误判', () => {
  it('横 2 + 竖 2 在角落相接但无任一方向≥3，返回空', () => {
    const g = [
      ['x', 'x', 'a'],
      ['x', 'b', 'c'],
      ['d', 'e', 'f'],
    ];
    // 第0行 x,x（长度2） + 第0列 x,x（长度2），均未达三连
    const m = detectMatch3(g);
    expect(m.length).toBe(0);
  });
  it('L 形且其中一侧恰达三连，只报真正三连的坐标', () => {
    const g = [
      ['x', 'x', 'x'],
      ['x', 'b', 'c'],
      ['a', 'e', 'f'],
    ];
    // 第0行三连(3个) + 第0列 x,x（长度2，不报）
    const m = detectMatch3(g);
    expect(m).toContainEqual({ row: 0, col: 0 });
    expect(m).toContainEqual({ row: 0, col: 1 });
    expect(m).toContainEqual({ row: 0, col: 2 });
    expect(m.length).toBe(3);
  });
});

describe('isAdjacent · 边界', () => {
  it('行/列差同时非零（对角）不相邻', () => {
    expect(isAdjacent({ row: 1, col: 1 }, { row: 2, col: 2 })).toBe(false);
  });
  it('同格不算相邻', () => {
    expect(isAdjacent({ row: 1, col: 1 }, { row: 1, col: 1 })).toBe(false);
  });
});
