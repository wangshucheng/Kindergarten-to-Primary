import { describe, it, expect } from 'vitest';
import { buildMemoryTiles, getCards } from '../games/hanzi/FlipMemory/flipLogic';

const cards = getCards();

describe('FlipMemory 翻牌记忆逻辑', () => {
  it('getCards 返回非空字卡', () => {
    expect(cards.length).toBeGreaterThan(0);
  });

  it('buildMemoryTiles：牌数 = 对数 * 2', () => {
    const tiles = buildMemoryTiles(6, 123);
    expect(tiles.length).toBe(12);
  });

  it('buildMemoryTiles：每对 key 恰好两张且内容一致', () => {
    const tiles = buildMemoryTiles(8, 456);
    const byKey = new Map<string, number>();
    for (const t of tiles) {
      byKey.set(t.pairKey, (byKey.get(t.pairKey) ?? 0) + 1);
      expect(t.card.char).toBe(t.pairKey);
    }
    for (const [, n] of byKey) expect(n).toBe(2);
  });

  it('buildMemoryTiles：对数超出字表时被截断', () => {
    const tiles = buildMemoryTiles(cards.length + 50, 789);
    expect(tiles.length).toBe(cards.length * 2);
  });

  it('buildMemoryTiles：同种子可复现', () => {
    const a = buildMemoryTiles(5, 321);
    const b = buildMemoryTiles(5, 321);
    expect(a).toEqual(b);
  });

  it('buildMemoryTiles：不同种子顺序不同（洗牌生效）', () => {
    const a = buildMemoryTiles(8, 1);
    const b = buildMemoryTiles(8, 2);
    expect(a.map((t) => t.card.char)).not.toEqual(b.map((t) => t.card.char));
  });
});
