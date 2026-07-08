import { describe, it, expect } from 'vitest';
import {
  generateBoard,
  isCovered,
  freeTileIds,
  hasTenPair,
  type MakeTenTile,
  type MakeTenLevel,
} from '../games/math/MakeTen/makeTenLogic';

function valueCounts(tiles: MakeTenTile[]): Record<number, number> {
  const m: Record<number, number> = {};
  for (const t of tiles) m[t.value] = (m[t.value] ?? 0) + 1;
  return m;
}

describe('MakeTen 凑十法逻辑', () => {
  it('generateBoard：牌数 = pairsTotal * 2', () => {
    const level: MakeTenLevel = { rows: 4, cols: 4, layers: 2, pairsPerLayer: 4 };
    const { tiles, pairsTotal } = generateBoard(level, 123);
    expect(tiles.length).toBe(pairsTotal * 2);
    expect(pairsTotal).toBeGreaterThan(0);
  });

  it('generateBoard：所有牌可两两凑十（完美匹配不变量，关卡可解）', () => {
    const level: MakeTenLevel = { rows: 5, cols: 5, layers: 3, pairsPerLayer: 6 };
    const { tiles } = generateBoard(level, 999);
    const counts = valueCounts(tiles);
    // 对任意值 v：n(v) == n(10-v)；v=5 时 n 为偶数 —— 即整体能被划分为和为10的对
    for (const v of [1, 2, 3, 4, 6, 7, 8, 9]) {
      expect(counts[v] ?? 0).toBe(counts[10 - v] ?? 0);
    }
    expect((counts[5] ?? 0) % 2).toBe(0);
    for (const t of tiles) {
      expect(t.value).toBeGreaterThanOrEqual(1);
      expect(t.value).toBeLessThanOrEqual(9);
    }
  });

  it('generateBoard：同种子可复现', () => {
    const level: MakeTenLevel = { rows: 4, cols: 4, layers: 2, pairsPerLayer: 3 };
    const a = generateBoard(level, 555);
    const b = generateBoard(level, 555);
    expect(a.tiles).toEqual(b.tiles);
  });

  it('freeTileIds：单层棋盘全部可点（无遮挡）', () => {
    const level: MakeTenLevel = { rows: 3, cols: 3, layers: 1, pairsPerLayer: 3 };
    const { tiles } = generateBoard(level, 321);
    const free = freeTileIds(tiles, new Set());
    expect(free.size).toBe(tiles.length);
  });

  it('isCovered：高层遮挡判定正确', () => {
    const base: MakeTenTile = { id: 0, value: 1, emoji: '1️⃣', layer: 0, x: 1, y: 1 };
    const cover: MakeTenTile = { id: 1, value: 2, emoji: '2️⃣', layer: 1, x: 1.2, y: 1.1 };
    const far: MakeTenTile = { id: 2, value: 3, emoji: '3️⃣', layer: 1, x: 5, y: 5 };
    const living = [base, cover, far];
    expect(isCovered(living, base)).toBe(true); // 被 cover 遮挡
    expect(isCovered(living, cover)).toBe(false); // 顶层不遮挡
    expect(isCovered(living, far)).toBe(false);
  });

  it('freeTileIds：多层时顶层可点、被遮挡层不可点', () => {
    const base: MakeTenTile = { id: 0, value: 1, emoji: '1️⃣', layer: 0, x: 1, y: 1 };
    const cover: MakeTenTile = { id: 1, value: 2, emoji: '2️⃣', layer: 1, x: 1.2, y: 1.1 };
    const tiles = [base, cover];
    const free = freeTileIds(tiles, new Set());
    expect(free.has(1)).toBe(true); // 顶层可点
    expect(free.has(0)).toBe(false); // 底层被遮挡
  });

  it('hasTenPair：两张 value 都是 3（无遮挡）无匹配对', () => {
    const tiles: MakeTenTile[] = [
      { id: 0, value: 3, emoji: '3️⃣', layer: 0, x: 1, y: 1 },
      { id: 1, value: 3, emoji: '3️⃣', layer: 0, x: 2, y: 1 },
    ];
    expect(hasTenPair(tiles, new Set())).toBe(false);
  });

  it('hasTenPair：value 为 3 和 7 的两张存在匹配对', () => {
    const tiles: MakeTenTile[] = [
      { id: 0, value: 3, emoji: '3️⃣', layer: 0, x: 1, y: 1 },
      { id: 1, value: 7, emoji: '7️⃣', layer: 0, x: 2, y: 1 },
    ];
    expect(hasTenPair(tiles, new Set())).toBe(true);
  });

  it('hasTenPair：上层遮挡导致 free 中无匹配对', () => {
    // 底层 3 被遮挡（不可点），仅剩顶层 7 → 无匹配对
    const tiles: MakeTenTile[] = [
      { id: 0, value: 3, emoji: '3️⃣', layer: 0, x: 1, y: 1 },
      { id: 1, value: 7, emoji: '7️⃣', layer: 1, x: 1.2, y: 1.1 },
    ];
    expect(hasTenPair(tiles, new Set())).toBe(false);
  });
});
